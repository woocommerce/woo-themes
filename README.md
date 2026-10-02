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
4. Approve the pending **Theme CI** run on the PR, then review and merge once checks pass. **Merging publishes the release automatically.** [GitHub requires approval](https://docs.github.com/en/actions/concepts/security/github_token) for workflow runs triggered by PRs created with `GITHUB_TOKEN`.

The changelog uses standard GitHub merge and squash commit messages. Direct commits and rebase merges are not included; review the changelog before merging. Keep the standard merge messages so PR titles can be collected.

Before merging, you can rerun the workflow with the same version to update the existing preparation branch and PR. Each run regenerates the changes from current `trunk`, so make any manual changelog edits after the final run.

To preview the file changes locally from a clean checkout with release tags fetched, run `node scripts/prepare-release.mjs 0.0.3`. This edits the two theme files without committing or opening a PR.

## Releasing Purple

**Release Purple** runs automatically when a maintainer merges a preparation PR into `trunk`. It only releases PRs created by `github-actions[bot]` from this repository's `codex/prepare-purple-*` branches. Closing without merging, ordinary PRs, and fork PRs do not publish a release. There is no second manual action or release approval.

The merge event supplies the exact commit to release, so later trunk changes stay out of the ZIP. The workflow reads the version and changelog from that commit, creates `purple/X.Y.Z` there, and publishes a GitHub release with the prepared notes and `purple-X.Y.Z.zip` attached. The ZIP contains only the committed `purple/` directory, ready for WordPress's theme installer. Human review and CI happen before merging; publishing does not repeat them or sync to WordPress.com.

An existing tag or release (including a draft) stops the run without changing it. If a run fails after pushing the tag, inspect the tag's commit and any draft release/assets before recovering manually. Either finish that exact release manually, or remove only the unpublished partial release and its tag before retrying. Do not delete or replace an already published release. The workflow never force-pushes tags or overwrites assets.

To preview the release ZIP locally without publishing anything, fetch trunk and tags, then run `node scripts/release-purple.mjs <full-merge-commit-SHA> <output-directory>`. Inspect `release-notes.md` and run `unzip -t <output-directory>/purple-X.Y.Z.zip`. The script only reads Git history and writes local output files; it does not create tags or releases. Run `node --test tests/release-purple.test.mjs` for isolated fixtures covering ZIP contents and release notes. The live merge trigger, publication permissions, and WordPress installation still need verification during the first intended release after both workflows land on trunk.
