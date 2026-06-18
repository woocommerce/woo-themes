<?php
/**
 * Title: Categories on three columns
 * Slug: purple/categories-on-three-columns
 * Categories: woo-commerce, purple
 * Keywords: text, media, columns
 * Description: A section with three columns of Featured Category blocks.
 */
?>
<!-- wp:group {"metadata":{"name":"Categories on three columns","patternName":"purple/categories-on-three-columns","description":"A section with three columns of categories with images.","categories":["text","media","columns"]},"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50"},"margin":{"top":"0","bottom":"0"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="margin-top:0;margin-bottom:0;padding-top:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50)"><!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:woocommerce/featured-category {"dimRatio":0,"imageFit":"cover","minHeight":600,"contentAlign":"center"} -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-button-1"} -->
<div class="wp-block-button is-style-button-1"><a class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Shop now', 'purple' ); ?></a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
<!-- /wp:woocommerce/featured-category --></div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column"><!-- wp:woocommerce/featured-category {"dimRatio":0,"imageFit":"cover","minHeight":600,"contentAlign":"center"} -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-button-1"} -->
<div class="wp-block-button is-style-button-1"><a class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Shop now', 'purple' ); ?></a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
<!-- /wp:woocommerce/featured-category --></div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column"><!-- wp:woocommerce/featured-category {"dimRatio":0,"imageFit":"cover","minHeight":600,"contentAlign":"center"} -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-button-1"} -->
<div class="wp-block-button is-style-button-1"><a class="wp-block-button__link wp-element-button"><?php esc_html_e( 'Shop now', 'purple' ); ?></a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
<!-- /wp:woocommerce/featured-category --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
