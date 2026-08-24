<?php
/**
 * WordPress integration regression checks for Purple.
 *
 * Run individual stages with wp-env and WP-CLI's eval-file command.
 */

/**
 * Fail the integration run when an expectation is not met.
 *
 * @param bool   $condition Condition that must be true.
 * @param string $message   Failure explanation.
 * @return void
 */
function purple_test_assert( bool $condition, string $message ): void {
	if ( ! $condition ) {
		fwrite( STDERR, "FAIL: {$message}\n" );
		exit( 1 );
	}
}

$stage = $args[0] ?? '';

purple_test_assert( class_exists( 'WooCommerce' ), 'WooCommerce must be active.' );
purple_test_assert( wp_get_theme( 'purple' )->exists(), 'Purple must be installed.' );
purple_test_assert( wp_get_theme( 'purple-child' )->exists(), 'The Purple child fixture must be installed.' );
purple_test_assert( wp_get_theme( 'ci-placeholder-theme' )->exists(), 'The placeholder theme must be installed.' );

switch ( $stage ) {
	case 'assert-activation':
		purple_test_assert( 'purple' === get_stylesheet(), 'Purple must be active.' );
		break;

	case 'assert-child-assets':
		purple_test_assert( 'purple-child' === get_stylesheet(), 'The Purple child fixture must be active.' );
		$GLOBALS['wp_styles'] = null;
		do_action( 'wp_enqueue_scripts' );

		$parent_style = wp_styles()->registered['purple-style'] ?? null;

		purple_test_assert( null !== $parent_style, 'The Purple parent stylesheet must be registered.' );
		purple_test_assert(
			false !== strpos( $parent_style->src, '/themes/purple/style.css' ),
			'The parent stylesheet must load from the Purple directory when a child theme is active.'
		);
		break;

	default:
		purple_test_assert( false, "Unknown integration-test stage: {$stage}" );
}

fwrite( STDOUT, "Passed: {$stage}.\n" );
