<?php
/**
 * Title: post-meta
 * Slug: woostarter/post-meta
 * Inserter: no
 */
?>
<!-- wp:group {"style":{"spacing":{"blockGap":"4px"}},"fontSize":"small","layout":{"type":"flex","flexWrap":"wrap"}} -->
<div class="wp-block-group has-small-font-size"><!-- wp:post-date /-->

<!-- wp:paragraph -->
<p><?php esc_html_e('·', 'woostarter');?></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><?php esc_html_e('Written by', 'woostarter');?></p>
<!-- /wp:paragraph -->

<!-- wp:post-author-name /-->

<!-- wp:paragraph -->
<p><?php esc_html_e('in', 'woostarter');?></p>
<!-- /wp:paragraph -->

<!-- wp:post-terms {"term":"category"} /--></div>
<!-- /wp:group -->