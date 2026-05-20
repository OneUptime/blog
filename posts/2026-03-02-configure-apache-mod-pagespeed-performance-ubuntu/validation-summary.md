# Validation Summary: How to Configure Apache mod_pagespeed for Performance on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Apache HTTP Server 2.4
- mod_pagespeed / PageSpeed Module
- Apache configuration
- Web performance optimization
- HTTP caching and cache purging

## Sources Consulted
- Google PageSpeed Module overview: https://developers.google.com/speed/pagespeed/module
- mod_pagespeed 1.1 Getting Started: https://modpagespeed.com/1.1/docs/getting-started/
- mod_pagespeed 1.1 Configuration: https://modpagespeed.com/1.1/docs/configuration/
- mod_pagespeed 1.1 Filter Reference: https://modpagespeed.com/1.1/docs/filter-reference/
- mod_pagespeed 1.1 Directive Index: https://modpagespeed.com/1.1/docs/directive-index/
- mod_pagespeed 1.1 Caching documentation: https://modpagespeed.com/1.1/docs/caching/
- Legacy PageSpeed System Integration documentation: https://www.modpagespeed.com/doc/system
- Legacy PageSpeed Admin Pages documentation: https://www.modpagespeed.com/doc/admin
- Legacy Add Instrumentation filter documentation for BeaconUrl defaults: https://www.modpagespeed.com/doc/filter-instrumentation-add
- Apache HTTP Server 2.4 access control documentation: https://httpd.apache.org/docs/2.4/howto/access.html

## Issues Found
- The install section used the old Google `mod-pagespeed-stable_current_amd64.deb` package as the current package source. Updated it to the current mod_pagespeed 1.1 package URL and pointed readers to the current official getting-started page.
- The install flow did not mention that mod_pagespeed 1.1 packages require trial or license activation before rewriting responses. Added a concise activation note.
- `ModPagespeedStatsLogging` is not the documented directive. Changed it to `ModPagespeedStatisticsLogging`.
- The `move_css_above_scripts` filter was described as moving JavaScript to the end of the body. Corrected the comment to say it moves CSS above scripts.
- The WebP filter example only enabled lossless WebP conversion but described all image-to-WebP conversion. Added `convert_jpeg_to_webp` and narrowed the `convert_to_webp_lossless` comment to PNG/GIF conversion.
- The `resize_rendered_image_dimensions` filter was described as a mobile-specific resize filter. Corrected the comment to say it resizes images to rendered dimensions.
- The Apache virtual-host example used the nginx default beacon path `/ngx_pagespeed_beacon`. Changed it to Apache's `/mod_pagespeed_beacon`.
- The virtual-host example included `ModPagespeedMinImageSizeLimitForWebpInCss`, which I could not verify in the official directive index. Replaced the inline-resource limits with documented directives `ModPagespeedImageInlineMaxBytes` and `ModPagespeedCssImageInlineMaxBytes`.
- The admin access-control example used deprecated Apache 2.2 `Order`/`Allow` directives. Replaced them with Apache 2.4 `Require local` and `Require ip`.
- The cache configuration used `ModPagespeedExpireSpecificationMs`, which is not in the current directive index. Replaced it with documented `ModPagespeedImplicitCacheTtlMs`.
- The cache purge command used `purge_cache=true`, which does not match the documented admin purge URL. Changed it to `/pagespeed_admin/cache?purge=*` and added `ModPagespeedEnableCachePurge on`.
- The cache-flush example deleted files directly from the cache directory. Replaced it with the documented `cache.flush` mechanism.
- The response-header example used an old 1.13 version string after the install section was updated to 1.1. Changed it to the current package version example.

## Review Notes
The old Google-hosted package URL still returned a Debian package during review, but it is from 2018 and is not the current official install path. The post is now oriented toward current mod_pagespeed 1.1 packages while retaining legacy Apache directive syntax where the current docs document compatibility.
