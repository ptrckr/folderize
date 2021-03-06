# folderize

The folderize utility copies files from multiple sources into a single destination folder.&nbsp;&nbsp;In the destination folder the files are sorted in a folder tree created by their last modification time (`mtime`).

![Termial Preview](./preview/terminal.png)

## Synopsis

<pre><b>folderize</b> [<b>-c</b>] <b>--input</b> <ins>PATH</ins> <ins>...</ins> [<b>--output</b> <ins>PATH</ins>] [<b>--locale</b> <ins>LOCALE</ins>] [<b>--exclude</b> <ins>REGEX</ins>]</pre>

## Options

<div><code><b>--input</b>, <b>-i</b> <ins>PATH</ins> <ins>...</ins></code></div>
<dl><dd>The input folder(s).</dd></dl>

<div><code><b>--output</b>, <b>-o</b> <ins>PATH</ins></code></div>
<dl><dd>The destination folder.&nbsp;&nbsp;The current folder (./) is used as default.</dd></dl>

<div><code><b>--dirstruct</b>, <b>-d</b> <ins>STRING</ins></code></div>
<dl><dd>Structure that should be constructed in the output directory.&nbsp;&nbsp;Every slash will create a new subdirectory.&nbsp;&nbsp;The default is <code>%Y/%B/%e</code> which will result in <code>2020/February/1</code>.<br/><br/>
<table>
  <thead>
    <tr><th colspan="2">Day</th><th colspan="2">Month</th><th colspan="2">Year</th></tr>
  </thead>
  <tbody>
    <tr><td>e</td><td>Day <code>1</code></td><td>m</td><td>Month, 2-digit <code>02</code></td><td>Y</td><td>Year <code>2020</code></td></tr>
    <tr><td>d</td><td>Day, 2-digit <code>01</code></td><td>b</td><td>Month, short <code>Feb</code></td><td>y</td><td>Year, 2-digit <code>20</code></td></tr>
    <tr><td></td><td></td><td>B</td><td>Month, long <code>February</code></td><td></td><td></td></tr>
    <tr><td colspan="6">1 February 2020</td></tr>
  </tbody>
</table>
</dd></dl>

<div><code><b>--locale</b>, <b>-l</b> <ins>LOCALE</ins></code></div>
<dl><dd>The locale to be used for folder creation in the destination folder.&nbsp;&nbsp;Locales other than english need at least node v.13 or node build with full-icu.&nbsp;&nbsp;The default is en−US.</pre></dd></dl>

<div><code><b>--exclude</b>, <b>-e</b> <ins>REGEX</ins></code></div>
<dl><dd>The files and/or folders names which shall not be copied.&nbsp;&nbsp;The regex must not be enclosed by slashes.</pre></dd></dl>

<div><code><b>--cache</b>, <b>-c</b></code></div>
<dl><dd>Enables the creation/use of the cache file `folderize.cache'.</dd></dl>

## Tests

There is currently an integration test that should be run with the same options, excluding input and output, like you would intend to run `folderize` itself.

<pre><b>npx jasmine --</b> [<b>-c</b>] [<b>--locale</b> <ins>LOCALE</ins>] [<b>--exclude</b> <ins>REGEX</ins>]</pre>