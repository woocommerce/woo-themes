#!/usr/bin/env bash

set -euo pipefail

wp_cli() {
	pnpm exec wp-env run cli wp "$@"
}

wp_cli plugin activate woocommerce
wp_cli theme activate ci-placeholder-theme
wp_cli theme activate purple
wp_cli eval-file wp-content/theme-tests/theme-regressions.php assert-activation

for scenario in missing inactive outdated exact newer; do
	wp_cli eval-file wp-content/theme-tests/woocommerce-notice.php "$scenario" --skip-plugins=woocommerce
done

wp_cli theme activate purple-child
wp_cli eval-file wp-content/theme-tests/theme-regressions.php assert-child-assets
wp_cli eval-file wp-content/theme-tests/woocommerce-notice.php missing --skip-plugins=woocommerce
