<?php
/**
 * Exercise compatibility notices with WordPress APIs and simulated WooCommerce states.
 * Run with WooCommerce skipped so each process can provide its own WC_VERSION.
 */

require_once ABSPATH . 'wp-admin/includes/screen.php';
require_once ABSPATH . 'wp-admin/includes/user.php';
require_once get_template_directory() . '/inc/woocommerce-compatibility.php';

/**
 * Fail a check without bypassing fixture cleanup.
 */
function purple_notice_assert( bool $condition, string $message ): void {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

$scenario = $args[0] ?? '';
purple_notice_assert( ! defined( 'WC_VERSION' ), 'Run this check with --skip-plugins=woocommerce.' );
$headers = get_file_data( get_template_directory() . '/style.css', array( 'minimum' => 'WC requires at least' ) );
$minimum = $headers['minimum'];
purple_notice_assert( '' !== $minimum, 'Read the requirement from Purple, including when a child theme is active.' );

$versions = array( 'outdated' => '0.0.1', 'exact' => $minimum . '.0', 'newer' => '999.0.0' );
if ( isset( $versions[ $scenario ] ) ) {
	define( 'WC_VERSION', $versions[ $scenario ] );
}

// Simulate installed-plugin discovery without moving or deleting the real plugin.
$plugins = 'missing' === $scenario ? array() : array( 'woocommerce/woocommerce.php' => array( 'Name' => 'WooCommerce' ) );
wp_cache_set( 'plugins', array( '' => $plugins ), 'plugins' );
$user_id = wp_insert_user(
	array(
		'user_login' => 'purple-notice-' . uniqid(),
		'user_pass'  => wp_generate_password(),
		'role'       => 'administrator',
	)
);
purple_notice_assert( ! is_wp_error( $user_id ), 'Create the test administrator.' );

try {
	$user = wp_set_current_user( $user_id );
	set_current_screen( 'themes' );
	ob_start();
	do_action( 'admin_notices' );
	$output = ob_get_clean();

	$expected = array(
		'missing'  => 'Please install and activate WooCommerce.',
		'inactive' => 'Please activate WooCommerce.',
		'outdated' => 'You are running WooCommerce 0.0.1.',
	);
	if ( isset( $expected[ $scenario ] ) ) {
		purple_notice_assert( false !== strpos( $output, $expected[ $scenario ] ), 'Display the appropriate explanation.' );
		purple_notice_assert( false !== strpos( $output, 'WooCommerce ' . $minimum ), 'Display the header requirement.' );
		purple_notice_assert( false === strpos( $output, 'is-dismissible' ), 'Keep the compatibility warning non-dismissible.' );
		$links = array( 'missing' => 'plugin-install.php?s=WooCommerce&tab=search&type=term', 'inactive' => 'plugins.php?plugin_status=inactive', 'outdated' => 'plugins.php?plugin_status=upgrade' );
		purple_notice_assert( false !== strpos( html_entity_decode( $output, ENT_QUOTES, 'UTF-8' ), $links[ $scenario ] ), 'Link to the appropriate admin screen.' );
	} else {
		purple_notice_assert( in_array( $scenario, array( 'exact', 'newer' ), true ), 'Recognize the scenario.' );
		purple_notice_assert( false === strpos( $output, 'purple-woocommerce-notice' ), 'Do not warn on compatible versions.' );
	}

	if ( 'missing' === $scenario ) {
		foreach ( array( 'dashboard', 'plugins', 'update-core', 'edit-post' ) as $screen_id ) {
			set_current_screen( $screen_id );
			purple_notice_assert( '' === purple_get_woocommerce_notice(), 'Hide the notice on ' . $screen_id . '.' );
		}
		set_current_screen( 'themes' );

		$user->remove_cap( 'install_plugins' );
		$user->add_cap( 'install_plugins', false );
		purple_notice_assert( false === strpos( purple_get_woocommerce_notice(), '<a ' ), 'Do not offer installation without permission.' );
		$user->remove_cap( 'install_plugins' );

		$user->set_role( 'subscriber' );
		purple_notice_assert( '' === purple_get_woocommerce_notice(), 'Hide the notice from subscribers.' );
	}
} finally {
	wp_delete_user( $user_id );
	wp_cache_delete( 'plugins', 'plugins' );
}

WP_CLI::success( 'WooCommerce notice: ' . $scenario . ' (' . get_stylesheet() . ').' );
