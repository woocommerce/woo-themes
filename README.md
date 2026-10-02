# Woo Themes

A repository for WooCommerce starter themes.

## Installing Purple

1. Check the [Purple requirements](purple/readme.txt) before installing the theme.
2. Install and activate [WooCommerce](https://wordpress.org/plugins/woocommerce/).
3. Copy the `purple` directory into your site's `wp-content/themes` directory, or zip the `purple` directory and upload it via **Appearance → Themes → Add New Theme → Upload Theme**.
4. In the WordPress admin, go to **Appearance → Themes** and activate **Purple**.
5. Go to **Appearance → Editor** to customize your store.

## Releasing Purple

1. In GitHub Actions, open **Prepare Purple release** and choose **Run workflow** on `trunk`.
2. Enter the new version as `X.Y.Z` (for example, `1.0.2`). It must be newer than the current theme version and previous release.
3. Review the generated PR's version, stable tag, and changelog changes.
4. Approve the pending **Theme CI** run, then merge the PR once checks pass.
5. **Merging the preparation PR triggers Release Purple**, which creates the tag and GitHub release with the prepared notes and Purple-only ZIP.

### Notes

- The changelog collects PR titles from standard merge and squash commit messages.
- Direct commits and rebase merges are omitted; review and edit the changelog after the final preparation run, before merging.
- Rerunning preparation with the same version updates the existing PR from current `trunk`.
- Automatic publishing only handles merged PRs created by `github-actions[bot]` from this repository's `codex/prepare-purple-*` branches into `trunk`.
- An existing tag or release, including a draft, stops publication without overwriting anything.
- After a partial failure, inspect the tag and draft release. Finish manually, or remove the unpublished partial release and tag before retrying. Never replace a published release.
- Preview preparation locally: `node scripts/prepare-release.mjs 1.0.2` in a clean checkout with release tags fetched.
- Preview the ZIP and notes locally: `node scripts/release-purple.mjs <merge-commit-SHA> <output-directory>`.
