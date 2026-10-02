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

Before merging, you can rerun the workflow with the same version to update the existing preparation branch and PR. Each run regenerates the changes from current `trunk`, so make any manual changelog edits after the final run.

To preview the file changes locally from a clean checkout with release tags fetched, run `node scripts/prepare-release.mjs 0.0.3`. This edits the two theme files without committing or opening a PR.

## Releasing Purple

After the release preparation PR is merged, open **Actions → Release Purple → Run workflow**. Select **trunk** as the workflow branch and paste the full 40-character SHA of the prepared commit (usually the preparation PR's merge or squash commit). Runs on other workflow branches are skipped. The selected commit must be in trunk's history; it can be older than trunk's current tip.

The workflow reads the matching `Version` in `purple/style.css` and `Stable tag` in `purple/readme.txt`, and requires a nonempty `= X.Y.Z =` section under `== Changelog ==`. It creates `purple/X.Y.Z` at that exact commit and publishes a GitHub release with that section's contents as its notes and `purple-X.Y.Z.zip` attached. The ZIP contains the committed `purple/` directory, ready to upload through WordPress's theme installer. No dependency build is needed for this theme. This workflow only publishes prepared files; it does not prepare versions or sync to WordPress.com.

An existing tag or release (including a draft) stops the run without changing it. If a run fails after pushing the tag, inspect the tag's commit and any draft release/assets before recovering manually. Either finish that exact release manually, or remove only the unpublished partial release and its tag before retrying. Do not delete or replace an already published release. The workflow never force-pushes tags or overwrites assets.

To preview the release ZIP locally without publishing anything, fetch trunk and tags, then run `node scripts/release-purple.mjs <full-commit-SHA> <output-directory>`. Inspect `release-notes.md` and run `unzip -t <output-directory>/purple-X.Y.Z.zip`. The script only reads Git history and writes local output files; it does not create tags or releases. Run `node --test tests/release-purple.test.mjs` for isolated fixtures covering validation and ZIP contents. Live tag creation, permissions, release publication, and a WordPress upload still need verification when deliberately publishing a prepared release after the workflow lands on trunk.
