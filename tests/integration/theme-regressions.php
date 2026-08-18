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

/**
 * Return the Cart page created for this integration run.
 *
 * @return int
 */
function purple_test_cart_page_id(): int {
	return (int) get_option( 'purple_test_cart_page_id', 0 );
}

$stage = $args[0] ?? '';

purple_test_assert( class_exists( 'WooCommerce' ), 'WooCommerce must be active.' );
purple_test_assert( wp_get_theme( 'purple' )->exists(), 'Purple must be installed.' );
purple_test_assert( wp_get_theme( 'purple-child' )->exists(), 'The Purple child fixture must be installed.' );

switch ( $stage ) {
	case 'prepare-customized-cart':
		purple_test_assert( 'twentytwentyfive' === get_stylesheet(), 'Twenty Twenty-Five must be active during setup.' );

		$custom_content = '<!-- wp:paragraph --><p>Merchant cart customization</p><!-- /wp:paragraph -->';
		$cart_page_id   = wp_insert_post(
			array(
				'post_title'   => 'Cart regression test',
				'post_content' => $custom_content,
				'post_status'  => 'publish',
				'post_type'    => 'page',
			),
			true
		);
		purple_test_assert( ! is_wp_error( $cart_page_id ), 'The customized Cart page must be created.' );

		update_option( 'purple_test_cart_page_id', $cart_page_id );
		update_option( 'purple_test_custom_cart_content', $custom_content );
		update_option( 'woocommerce_cart_page_id', $cart_page_id );
		delete_option( 'theme_mods_purple' );
		break;

	case 'assert-customized-cart':
		purple_test_assert( 'purple' === get_stylesheet(), 'Purple must be active for the customized Cart assertion.' );
		purple_test_assert(
			false !== has_action( 'after_switch_theme', 'purple_sync_cart_page_content' ),
			'The Cart migration must be registered for theme activation.'
		);
		purple_test_assert(
			get_option( 'purple_test_custom_cart_content' ) === get_post_field( 'post_content', purple_test_cart_page_id() ),
			'Activating Purple must not replace customized Cart page content.'
		);
		purple_test_assert(
			0 === (int) get_theme_mod( 'purple_cart_page_content_version', 0 ),
			'The Cart migration must not be marked complete when content is skipped.'
		);
		break;

	case 'prepare-empty-cart':
		purple_test_assert( 'twentytwentyfive' === get_stylesheet(), 'Twenty Twenty-Five must be active during setup.' );
		purple_test_assert( purple_test_cart_page_id() > 0, 'The Cart regression page must exist.' );

		$updated = wp_update_post(
			array(
				'ID'           => purple_test_cart_page_id(),
				'post_content' => '',
			),
			true
		);
		purple_test_assert( ! is_wp_error( $updated ), 'The Cart regression page must be emptied.' );
		delete_option( 'theme_mods_purple' );
		break;

	case 'assert-empty-cart':
		purple_test_assert( 'purple' === get_stylesheet(), 'Purple must be active for the empty Cart assertion.' );
		purple_test_assert(
			has_block( 'woocommerce/cart', get_post_field( 'post_content', purple_test_cart_page_id() ) ),
			'Activating Purple must seed its Cart block markup when the Cart page is empty.'
		);
		purple_test_assert(
			1 === (int) get_theme_mod( 'purple_cart_page_content_version', 0 ),
			'The Cart migration must be marked complete after a successful update.'
		);
		break;

	case 'assert-child-assets':
		purple_test_assert( 'purple-child' === get_stylesheet(), 'The Purple child fixture must be active.' );
		$GLOBALS['wp_styles']  = null;
		$GLOBALS['wp_scripts'] = null;
		do_action( 'wp_enqueue_scripts' );

		$parent_style  = wp_styles()->registered['purple-style'] ?? null;
		$parent_script = wp_scripts()->registered['purple-navigation-dropdown'] ?? null;

		purple_test_assert( null !== $parent_style, 'The Purple parent stylesheet must be registered.' );
		purple_test_assert( null !== $parent_script, 'The Purple parent navigation script must be registered.' );
		purple_test_assert(
			str_contains( $parent_style->src, '/themes/purple/style.css' ),
			'The parent stylesheet must load from the Purple directory when a child theme is active.'
		);
		purple_test_assert(
			str_contains( $parent_script->src, '/themes/purple/assets/js/navigation-dropdown.js' ),
			'The parent navigation script must load from the Purple directory when a child theme is active.'
		);
		break;

	default:
		purple_test_assert( false, "Unknown integration-test stage: {$stage}" );
}

fwrite( STDOUT, "Passed: {$stage}.\n" );
