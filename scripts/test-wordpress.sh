#!/usr/bin/env bash

set -euo pipefail

wp_cli() {
	pnpm exec wp-env run cli wp "$@"
}

if [[ -n "${EXPECTED_WP_VERSION:-}" ]]; then
	wp_cli eval-file wp-content/theme-tests/theme-regressions.php assert-core-version "$EXPECTED_WP_VERSION"
fi
wp_cli theme activate ci-placeholder-theme
# Preserve the declared minimum: an older core must reject Purple rather than
# bypassing requirements or claiming full theme compatibility.
requirements="$(wp_cli eval 'echo is_wp_version_compatible( wp_get_theme( "purple" )->get( "RequiresWP" ) ) ? "PURPLE_SUPPORTED" : "PURPLE_UNSUPPORTED";')"
if [[ "$requirements" == *PURPLE_UNSUPPORTED* ]]; then
	wp_cli eval-file wp-content/theme-tests/theme-regressions.php assert-unsupported-core
	exit 0
fi
[[ "$requirements" == *PURPLE_SUPPORTED* ]]
wp_cli plugin activate woocommerce
wp_cli theme activate purple
wp_cli eval-file wp-content/theme-tests/theme-regressions.php assert-activation

wp_cli theme activate purple-child
wp_cli eval-file wp-content/theme-tests/theme-regressions.php assert-child-assets
