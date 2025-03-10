<?php
/**
 * Title: mini-cart
 * Slug: woostarter/mini-cart
 * Inserter: no
 */
?>
<!-- wp:woocommerce/mini-cart-contents -->
<div class="wp-block-woocommerce-mini-cart-contents"><!-- wp:woocommerce/filled-mini-cart-contents-block -->
<div class="wp-block-woocommerce-filled-mini-cart-contents-block"><!-- wp:woocommerce/mini-cart-title-block -->
<div class="wp-block-woocommerce-mini-cart-title-block"><!-- wp:woocommerce/mini-cart-title-label-block -->
<div class="wp-block-woocommerce-mini-cart-title-label-block"></div>
<!-- /wp:woocommerce/mini-cart-title-label-block -->

<!-- wp:woocommerce/mini-cart-title-items-counter-block -->
<div class="wp-block-woocommerce-mini-cart-title-items-counter-block"></div>
<!-- /wp:woocommerce/mini-cart-title-items-counter-block --></div>
<!-- /wp:woocommerce/mini-cart-title-block -->

<!-- wp:woocommerce/mini-cart-items-block -->
<div class="wp-block-woocommerce-mini-cart-items-block"><!-- wp:woocommerce/mini-cart-products-table-block -->
<div class="wp-block-woocommerce-mini-cart-products-table-block"></div>
<!-- /wp:woocommerce/mini-cart-products-table-block --></div>
<!-- /wp:woocommerce/mini-cart-items-block -->

<!-- wp:woocommerce/mini-cart-footer-block -->
<div class="wp-block-woocommerce-mini-cart-footer-block"><!-- wp:woocommerce/mini-cart-cart-button-block -->
<div class="wp-block-woocommerce-mini-cart-cart-button-block"></div>
<!-- /wp:woocommerce/mini-cart-cart-button-block -->

<!-- wp:woocommerce/mini-cart-checkout-button-block -->
<div class="wp-block-woocommerce-mini-cart-checkout-button-block"></div>
<!-- /wp:woocommerce/mini-cart-checkout-button-block --></div>
<!-- /wp:woocommerce/mini-cart-footer-block --></div>
<!-- /wp:woocommerce/filled-mini-cart-contents-block -->

<!-- wp:woocommerce/empty-mini-cart-contents-block -->
<div class="wp-block-woocommerce-empty-mini-cart-contents-block"><!-- wp:group {"style":{"spacing":{"padding":{"right":"var:preset|spacing|50","left":"var:preset|spacing|50"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group" style="padding-right:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)"><!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center"><?php esc_html_e('Your cart is empty', 'woostarter');?></p>
<!-- /wp:paragraph -->

<!-- wp:woocommerce/mini-cart-shopping-button-block {"className":"is-style-fill"} -->
<div class="wp-block-woocommerce-mini-cart-shopping-button-block is-style-fill"></div>
<!-- /wp:woocommerce/mini-cart-shopping-button-block -->

<!-- wp:paragraph {"align":"center","fontSize":"small"} -->
<p class="has-text-align-center has-small-font-size"><?php /* Translators: 1. is the start of a 'a' HTML element, 2. is the end of a 'a' HTML element */ 
echo sprintf( esc_html__( 'Have an account? %1$sLog in%2$s to check out faster.', 'woostarter' ), '<a href="' . esc_url( '#' ) . '">', '</a>' ); ?></p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:woocommerce/empty-mini-cart-contents-block --></div>
<!-- /wp:woocommerce/mini-cart-contents -->