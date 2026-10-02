# Woo Themes

A repository for WooCommerce starter themes.

## Installing Purple

1. Check the [Purple requirements](purple/readme.txt) before installing the theme.
2. Install and activate [WooCommerce](https://wordpress.org/plugins/woocommerce/).
3. Copy the `purple` directory into your site's `wp-content/themes` directory, or zip the `purple` directory and upload it via **Appearance → Themes → Add New Theme → Upload Theme**.
4. In the WordPress admin, go to **Appearance → Themes** and activate **Purple**.
5. Go to **Appearance → Editor** to customize your store.

## Preparing a Purple release

1. In GitHub Actions, open **Prepare Purple release** and choose **Run workflow** on `trunk`.
2. Enter the new version as `X.Y.Z` (for example, `0.0.3`). It must be greater than the current theme version and previous release, and its tag must not already exist.
3. Review the generated PR. It updates `purple/style.css`, the stable tag in `purple/readme.txt`, and the readme changelog with PR titles since the nearest `purple/*` release tag on trunk's history.
4. Approve the pending **Theme CI** run on the PR, then review and merge once checks pass. [GitHub requires approval](https://docs.github.com/en/actions/concepts/security/github_token) for workflow runs triggered by PRs created with `GITHUB_TOKEN`.

The changelog uses standard GitHub merge and squash commit messages. Direct commits and rebase merges are not included; review the changelog before merging. Keep the standard merge messages so PR titles can be collected.

The workflow only prepares a PR. Tagging, ZIP creation, publishing, and WordPress.com syncing are separate steps.

Before merging, you can rerun the workflow with the same version to update the existing preparation branch and PR. Each run regenerates the changes from current `trunk`, so make any manual changelog edits after the final run.

To preview the file changes locally from a clean checkout with release tags fetched, run `node scripts/prepare-release.mjs 0.0.3`. This edits the two theme files without committing or opening a PR.
