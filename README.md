# Website 

```
This website is based heavily off the original designed by Dominik Moritz, 
https://github.com/domoritz/domoritz.github.io.
```

## Run

bundle exec jekyll serve --livereload

## Broken-link checks

The **Not Found Bot** workflow builds the website and checks links in the generated HTML on pushes and pull requests to `master`, on the first of each month, and through **Actions → Not Found Bot → Run workflow**. It checks internal pages and files as well as external websites, including links generated from YAML data and templates. Broken links fail the check and appear in the Actions job summary and the downloadable `link-check-report` artifact. Request failures such as timeouts or access restrictions are reported too; review them before changing a link.

On monthly and manual runs, a separate job uses notfoundbot to suggest HTTPS upgrades and Internet Archive replacements for Markdown links. An existing pull request labeled `notfoundbot` pauses new suggestions, with a review link in the job summary, but never prevents the website check from running. Merge or close that pull request to resume automatic suggestions.

To check locally with Lychee 0.24.2 after `bundle exec jekyll build`:

```sh
lychee --config .lychee.toml --root-dir "$PWD/_site" --no-progress './_site/**/*.html'
```

Add `--offline` to check only local pages and files. `.lychee.toml` contains the shared checker settings.

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/" style="text-decoration: none;"> <i class="fab fa-creative-commons fa-lg"></i> <i class="fab fa-creative-commons-by fa-lg"></i></a>
