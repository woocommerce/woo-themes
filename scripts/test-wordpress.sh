#!/usr/bin/env bash

set -euo pipefail

wp_cli() {
	pnpm exec wp-env run cli wp "$@"
}

wp_cli theme activate ci-placeholder
wp_cli eval-file wp-content/theme-tests/theme-regressions.php prepare-customized-cart
wp_cli theme activate purple
wp_cli eval-file wp-content/theme-tests/theme-regressions.php assert-customized-cart

wp_cli theme activate ci-placeholder
wp_cli eval-file wp-content/theme-tests/theme-regressions.php prepare-empty-cart
wp_cli theme activate purple
wp_cli eval-file wp-content/theme-tests/theme-regressions.php assert-empty-cart

wp_cli theme activate purple-child
wp_cli eval-file wp-content/theme-tests/theme-regressions.php assert-child-assets
