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

## WordPress CI coverage

Theme CI resolves the latest stable WordPress release and the newest patch of
its preceding release series from the [official version-check API](https://api.wordpress.org/core/version-check/1.7/)
on each run. For example, 7.1.3 selects 7.0.7 as the previous series, while 7.0
selects the newest 6.9 patch. Both jobs use exact release archives and verify the
installed version. Invalid or incomplete API responses fail resolution.

Purple retains its WordPress 7.1 minimum: its templates and patterns use
`@mobile` and `@tablet` responsive block styles, [introduced in WordPress 7.1](https://make.wordpress.org/core/2026/08/05/responsive-block-styles-and-configurable-viewports-in-wordpress-7-1/).
On a core below that minimum, CI verifies that WordPress's theme requirements
validation returns `theme_wp_incompatible`, leaving the placeholder theme active.
This job tests the requirement gate; it does not certify rendering compatibility
on unsupported WordPress versions. On supported cores, CI activates WooCommerce
and runs Purple activation and child-theme stylesheet checks. As the stable
release advances, the previous-series job automatically runs those checks too
when its version meets Purple's declared minimum.

Run `node --test tests/resolve-wordpress-versions.test.mjs` to test rolling version
selection and `node scripts/resolve-wordpress-versions.mjs` to inspect live targets.
