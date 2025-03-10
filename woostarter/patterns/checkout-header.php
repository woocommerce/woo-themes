<?php
/**
 * Title: checkout-header
 * Slug: woostarter/checkout-header
 * Inserter: no
 */
?>
<!-- wp:group {"tagName":"header","metadata":{"name":"Checkout Header"},"style":{"spacing":{"blockGap":"0"},"border":{"bottom":{"color":"var:preset|color|theme-4","width":"1px"},"top":[],"right":[],"left":[]}},"layout":{"type":"constrained"}} -->
<header class="wp-block-group" style="border-bottom-color:var(--wp--preset--color--theme-4);border-bottom-width:1px"><!-- wp:spacer {"height":"var:preset|spacing|30"} -->
<div style="height:var(--wp--preset--spacing--30)" aria-hidden="true" class="wp-block-spacer"></div>
<!-- /wp:spacer -->

<!-- wp:group {"align":"wide","style":{"spacing":{"padding":{"bottom":"0","top":"0"}}},"layout":{"type":"flex","justifyContent":"space-between"}} -->
<div class="wp-block-group alignwide" style="padding-top:0;padding-bottom:0"><!-- wp:site-title {"level":0} /-->

<!-- wp:paragraph -->
<p><?php /* Translators: 1. is the start of a 'a' HTML element, 2. is the end of a 'a' HTML element */ 
echo sprintf( esc_html__( '%1$sGo back%2$s', 'woostarter' ), '<a href="' . esc_url( '#' ) . '">', '</a>' ); ?></p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:spacer {"height":"var:preset|spacing|30"} -->
<div style="height:var(--wp--preset--spacing--30)" aria-hidden="true" class="wp-block-spacer"></div>
<!-- /wp:spacer --></header>
<!-- /wp:group -->