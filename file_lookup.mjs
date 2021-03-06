import fs from "fs";
import path from "path";

import { Read, bytes_equal } from "./utils/fs.mjs";
import { get_filehash } from "./utils/hash.mjs";
import { panic } from "./utils/panic.mjs";

export default class Lookup {
  static #CACHEFILENAME = ".folderize.cache";

  #root;
  #cachefile;
  #exclude;
  #index = new Map();

  /// Returns a new `Lookup` instance.
  ///
  /// [>] root :: string
  ///     Path to the directory to cache.
  /// [>] exclude[? = /^[]/] :: RegExp
  ///     Files to exclude.
  /// [<] Lookup
  constructor(root, exclude = /^[]/) {
    this.#root = root;
    this.#cachefile = path.join(this.#root, Lookup.#CACHEFILENAME);
    this.#exclude = exclude;
  }

  /// [§] Lookup::constructor
  static new(...args) {
    return new Lookup(...args);
  }

  /**
   * Generate the index from all files in root.
   * @param {function} [callback] - Will be called for every file.
   * @throws {Panic}
   * @returns {void}
   */
  generate(callback = (() => {})) {
    try {
      Read.dir(this.#root).on_file((fullname) => {
        callback(fullname);
        this.push(fullname);
      }).exclude(this.#exclude).iter();
    } catch(err) {
      panic(err)`Failed to generate the in-memory cache`;
    }
  }

  /// Update index against live folder.
  ///
  /// {*} Also remove files if their hash doesn't match anymore, i. e. the path hasn't changed but the contents were changed. Only compare hashes if mtime is different.
  /// [!] Panic
  /// [<] Object{ added: Array<string>, removed: Array<string> };
  update() {
    try {
      let diff = { added: [], removed: [] };
      
      const live_dir = Read.dir(this.#root).exclude(this.#exclude).collect(Read.FILE);

      // Filter live_dir to keep only files that are not in the index yet.
      // Remove files from the index that cannot be found in the live directory anymore.
      for (let [hash, rel_paths] of this.#index) {
        for (let rel_path of rel_paths) {
          const search = live_dir.indexOf(path.join(this.#root, rel_path));

          if (search !== -1) {  // Filepath exists.
            live_dir.splice(search, 1);
          } else {  // Filepath is invalid.
            this.remove(hash, rel_path);
            diff.removed.push(rel_path);
          }
        }
      };

      // Add the new files to the index.
      for (let fullname of live_dir) {
        this.push(fullname);
        diff.added.push(fullname);
      }

      return diff;
    } catch(err) {
      panic(err)`Failed to update index`;
    }
  }

  /**
   * Adds the given file to the index.
   * @param {string} fullname - Filepath to index.
   * @throws {Panic}
   * @returns {void}
   */
  push(fullname) {
    try {
      if (!this.contains(fullname)) {
        const hash = get_filehash(fullname);
        const rel_path = path.relative(this.#root, fullname);

        let entries = this.#index.get(hash) ?? Array();
        this.#index.set(hash, entries.concat(rel_path));
      }
    } catch(err) {
      panic(err)`Failed to push ${{ fullname }}`;
    }
  }

  /**
   * Removes an entry from the index.
   * @param {string} hash - Hash of the file.
   * @param {string} rel_path - Relative path to the file located in #root.
   * @throws {Panic}
   * @returns {void}
   */
  remove(hash, rel_path) {
    const entries = this.#index.get(hash);

    if (entries === undefined || !entries.includes(rel_path))
      panic`Path ${rel_path} with ${{ hash }} cannot be removed because it does not exist.`;

    if (entries.length === 1)
      this.#index.delete(hash);
    else
      this.#index.set(hash, entries.filter(entry => entry !== rel_path));
  }

  /**
   * Returns whether the index contains a file with the same contents.
   * @param {string} fullname - Filepath to check.
   * @throws {Panic}
   * @returns {bool}
   */
  contains(fullname) {
    const hash = get_filehash(fullname);
    const paths = this.#index.get(hash);

    // Hash does not exist.
    if (paths === undefined)
      return false;

    // Hash found, assert that file contents match.
    for (let rel_path of paths)
      if (bytes_equal(path.join(this.#root, rel_path), fullname))
        return true;

    // Hash collision, hash exists but contents do not match.
    return false;
  }

  /// Load and parse the cachefile.
  /// Overwrites the index.
  ///
  /// 1. Let <index> be an empty map.
  /// 2. Let <buffer> be the bytes from the cachefile.
  /// 3. Loop over the <buffer>.
  ///    1. Let <hash>, <file_count> be undefined.
  ///       Let <files> be an empty array.
  ///    2. Read <buffer> until <#>, store read bytes in <hash>.
  ///    3. Eat <#>.
  ///    4. Read <buffer> until <;>, store read bytes in <file_size>.
  ///    5. Eat <;>;
  ///    6. Loop <file_count> times.
  ///       1. Read <buffer> until <:>, store read bytes in <file_size>.
  ///       2. Eat <:>.
  ///       3. Read <file_size> from <buffer>, push read bytes into <files>.
  ///    7. Set <hash> in <index> to <files>.
  ///
  /// [!] Panic
  /// [<] bool
  load_cachefile() {
    // 1.
    let index = new Map();

    // 2.
    let buffer;
    try {
      buffer = fs.readFileSync(this.#cachefile);
    } catch(err) {
      if (err.code === "ENOENT")
        return false;

      panic(err)`Failed to load cachefile`;
    }

    // 3.
    for (let i = 0; i < buffer.length;) {
      // 3.1.
      let hash;
      let file_count;
      let files = Array();

      { // 3.2.
        const start = i;
        while(buffer[i] !== "#".charCodeAt()) ++i;
        hash = buffer.slice(start, i).toString();
        // 3.3.
        ++i;
      }

      { // 3.4.
        const start = i;
        while(buffer[i] !== ";".charCodeAt()) ++i;
        file_count = parseInt(buffer.slice(start, i).toString(), 10);
        // 3.5.
        ++i;
      }

      { // 3.6.
        for (let n = 0; n < file_count; ++n) {
          // 3.6.1.
          const start = i;
          while(buffer[i] !== ":".charCodeAt()) ++i;
          const file_size = parseInt(buffer.slice(start, i), 10);
          // 3.6.2.
          ++i;

          // 3.6.3.
          files.push(buffer.slice(i, i + file_size).toString());
          i += file_size;
        }
      }

      // 3.7.
      index.set(hash, files);
    }

    this.#index = index;
    return true;
  }

  /// Saves the index to disk.
  ///
  /// Cachefile format:
  /// hash <#> files.count <;> path.length <:> path [path.length <:> path] ...
  /// e1cde3a#1;10:foobar.txt
  ///
  /// [!] Panic
  /// [<] void
  save_cachefile() {
    let data = String();

    for (let [hash, rel_paths] of this.#index) {
      data += `${hash}#${rel_paths.length};`;

      for (let rel_path of rel_paths)
        data += `${Buffer.byteLength(rel_path)}:${rel_path}`;
    }

    try {
      fs.writeFileSync(this.#cachefile, data);
    } catch (err) {
      panic(err)`Failed to save cachefile`;
    }
  }
}