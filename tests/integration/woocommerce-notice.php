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

/**
 * Exercise the registered AJAX callback while intercepting WordPress termination.
 */
function purple_notice_test_dismiss( string $nonce ): string {
	$_REQUEST['nonce'] = $nonce;
	$handler = static function () {
		return static function ( $message ) {
			echo $message;
			throw new RuntimeException( 'ajax-finished' );
		};
	};
	add_filter( 'wp_die_ajax_handler', $handler );
	ob_start();
	try {
		do_action( 'wp_ajax_purple_dismiss_woocommerce_notice' );
	} catch ( RuntimeException $exception ) {
		if ( 'ajax-finished' !== $exception->getMessage() ) {
			throw $exception;
		}
	} finally {
		$output = ob_get_clean();
		remove_filter( 'wp_die_ajax_handler', $handler );
	}
	return $output;
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
	set_current_screen( 'dashboard' );
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
		purple_notice_assert( false !== strpos( $output, 'is-dismissible' ), 'Use a dismissible core notice.' );
		$links = array( 'missing' => 'plugin-install.php', 'inactive' => 'plugins.php', 'outdated' => 'update-core.php' );
		purple_notice_assert( false !== strpos( $output, $links[ $scenario ] ), 'Link to the appropriate admin screen.' );
		purple_woocommerce_notice_scripts();
		$script = wp_scripts()->registered['purple-woocommerce-notice'];
		purple_notice_assert( false !== strpos( $script->src, '/themes/purple/assets/js/' ), 'Load the parent theme script for child themes too.' );
	} else {
		purple_notice_assert( in_array( $scenario, array( 'exact', 'newer' ), true ), 'Recognize the scenario.' );
		purple_notice_assert( false === strpos( $output, 'purple-woocommerce-notice' ), 'Do not warn on compatible versions.' );
		purple_woocommerce_notice_scripts();
		purple_notice_assert( ! wp_script_is( 'purple-woocommerce-notice', 'enqueued' ), 'Do not enqueue dismissal code without a notice.' );
	}

	if ( 'missing' === $scenario ) {
		foreach ( array( 'themes', 'plugins', 'update-core' ) as $screen_id ) {
			set_current_screen( $screen_id );
			purple_notice_assert( '' !== purple_get_woocommerce_notice(), 'Show the notice on ' . $screen_id . '.' );
		}
		set_current_screen( 'edit-post' );
		purple_notice_assert( '' === purple_get_woocommerce_notice(), 'Avoid unrelated admin screens.' );
		set_current_screen( 'dashboard' );

		$user->remove_cap( 'install_plugins' );
		$user->add_cap( 'install_plugins', false );
		purple_notice_assert( false === strpos( purple_get_woocommerce_notice(), '<a ' ), 'Do not offer installation without permission.' );
		$user->remove_cap( 'install_plugins' );

		define( 'DOING_AJAX', true );
		purple_notice_assert( '-1' === purple_notice_test_dismiss( 'invalid' ), 'Reject an invalid dismissal nonce.' );
		purple_notice_assert( ! get_user_option( 'purple_woocommerce_notice_dismissed' ), 'Invalid requests must not dismiss the notice.' );

		$user->set_role( 'subscriber' );
		purple_notice_assert( '' === purple_get_woocommerce_notice(), 'Hide the notice from subscribers.' );
		$response = json_decode( purple_notice_test_dismiss( wp_create_nonce( 'purple_dismiss_woocommerce_notice' ) ), true );
		purple_notice_assert( false === $response['success'], 'Reject dismissal without the required capability.' );
		purple_notice_assert( ! get_user_option( 'purple_woocommerce_notice_dismissed' ), 'Unauthorized requests must not store dismissal.' );

		$user->set_role( 'administrator' );
		$response = json_decode( purple_notice_test_dismiss( wp_create_nonce( 'purple_dismiss_woocommerce_notice' ) ), true );
		purple_notice_assert( true === $response['success'], 'Accept an authorized dismissal.' );
		purple_notice_assert( '' === purple_get_woocommerce_notice(), 'Hide the notice after dismissal.' );
		global $wpdb;
		purple_notice_assert( (bool) get_user_meta( $user_id, $wpdb->get_blog_prefix() . 'purple_woocommerce_notice_dismissed', true ), 'Persist dismissal for this site.' );
		purple_notice_assert( '' === get_user_meta( $user_id, 'purple_woocommerce_notice_dismissed', true ), 'Do not save a network-wide dismissal.' );
	}
} finally {
	wp_delete_user( $user_id );
	wp_cache_delete( 'plugins', 'plugins' );
}

WP_CLI::success( 'WooCommerce notice: ' . $scenario . ' (' . get_stylesheet() . ').' );
