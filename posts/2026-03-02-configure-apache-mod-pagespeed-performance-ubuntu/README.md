# How to Configure Apache mod_pagespeed for Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Performance, Web Optimization, mod_pagespeed

Description: Install and configure Apache mod_pagespeed on Ubuntu to automatically optimize web page assets, reduce load times, and improve Core Web Vitals scores.

---

mod_pagespeed is a Google-developed Apache module that automatically applies web performance optimizations to your pages as they are served. It minifies CSS and JavaScript, optimizes images, combines and reorders resources, and applies dozens of other techniques that would otherwise require a manual build pipeline. The key advantage is that it works without changing your application code.

## Install mod_pagespeed

Google provides pre-built packages for Debian-based systems:

```bash
# Download the latest mod_pagespeed package
# Check https://developers.google.com/speed/pagespeed/module/download for the latest version
wget https://dl-ssl.google.com/dl/linux/direct/mod-pagespeed-stable_current_amd64.deb

# Install the package
sudo dpkg -i mod-pagespeed-stable_current_amd64.deb

# Fix any dependency issues
sudo apt-get install -f

# Verify the module installed
ls /etc/apache2/mods-available/ | grep pagespeed

# Enable the module
sudo a2enmod pagespeed

# Restart Apache
sudo systemctl restart apache2

# Verify it is loaded
apache2ctl -M | grep pagespeed
```

## Basic Configuration

mod_pagespeed installs its configuration at `/etc/apache2/mods-available/pagespeed.conf`. The default configuration enables a conservative set of filters. Review and customize it:

```bash
sudo nano /etc/apache2/mods-enabled/pagespeed.conf
```

Key settings at the top of the file:

```apache
<IfModule pagespeed_module>
    # Enable mod_pagespeed
    ModPagespeed on

    # Cache directory for optimized assets
    ModPagespeedFileCachePath /var/cache/mod_pagespeed/

    # Log directory
    ModPagespeedLogDir /var/log/pagespeed

    # Statistics endpoint (disable in production or restrict access)
    ModPagespeedStatistics off
    ModPagespeedStatsLogging off

    # How long pagespeed retains cached optimized resources
    ModPagespeedFileCacheSizeKb 102400

    # Interval for checking if the cache needs cleaning (in seconds)
    ModPagespeedFileCacheCleanIntervalMs 3600000

    # Inode limit for the cache directory
    ModPagespeedFileCacheInodeLimit 500000
</IfModule>
```

## Enable Core Optimization Filters

mod_pagespeed's behavior is controlled by filters. Enable specific filters based on what your site needs:

```apache
<IfModule pagespeed_module>
    ModPagespeed on

    # === JavaScript Optimization ===
    # Minify inline and linked JavaScript
    ModPagespeedEnableFilters rewrite_javascript

    # Combine multiple JS files into one (reduces HTTP requests)
    ModPagespeedEnableFilters combine_javascript

    # Move JavaScript to end of body for faster initial rendering
    ModPagespeedEnableFilters move_css_above_scripts

    # Defer loading of JavaScript that is not needed immediately
    ModPagespeedEnableFilters defer_javascript

    # === CSS Optimization ===
    # Minify CSS
    ModPagespeedEnableFilters rewrite_css

    # Combine multiple CSS files
    ModPagespeedEnableFilters combine_css

    # Inline small CSS files (avoids HTTP request overhead)
    ModPagespeedEnableFilters inline_css

    # Move CSS to the head for faster rendering
    ModPagespeedEnableFilters move_css_to_head

    # === Image Optimization ===
    # Compress and convert images
    ModPagespeedEnableFilters rewrite_images

    # Convert images to WebP format for supporting browsers
    ModPagespeedEnableFilters convert_to_webp_lossless

    # Resize images to the dimensions specified in HTML
    ModPagespeedEnableFilters resize_images

    # Resize mobile images based on screen size
    ModPagespeedEnableFilters resize_rendered_image_dimensions

    # Inline small images as base64 data URIs
    ModPagespeedEnableFilters inline_images

    # Lazy load images below the fold
    ModPagespeedEnableFilters lazyload_images

    # Strip image metadata (EXIF) to reduce file size
    ModPagespeedEnableFilters strip_image_meta_data

    # === HTML Optimization ===
    # Remove whitespace from HTML
    ModPagespeedEnableFilters collapse_whitespace

    # Remove HTML comments
    ModPagespeedEnableFilters remove_comments

    # Combine head elements
    ModPagespeedEnableFilters combine_heads

    # Flatten CSS @import statements
    ModPagespeedEnableFilters flatten_css_imports

    # === Caching ===
    # Add cache-busting to static resource URLs
    ModPagespeedEnableFilters extend_cache

    # Rewrite resource URLs for CDN delivery
    # ModPagespeedMapRewriteDomain cdn.example.com example.com
</IfModule>
```

## Configure Per Virtual Host

Apply different optimization settings to different sites:

```bash
sudo nano /etc/apache2/sites-available/mysite.conf
```

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/html

    <IfModule pagespeed_module>
        ModPagespeed on

        # Site-specific settings override global settings
        ModPagespeedFileCachePath /var/cache/mod_pagespeed/example.com/

        # Disable filters that cause issues with this application
        ModPagespeedDisableFilters combine_javascript

        # Set image quality for JPEG optimization (0-100)
        ModPagespeedImageRecompressionQuality 80

        # Set WebP quality
        ModPagespeedWebpRecompressionQuality 80

        # Domains that pagespeed is allowed to rewrite resources from
        ModPagespeedDomain example.com
        ModPagespeedDomain static.example.com

        # Domain for pagespeed's own resources (beacon, admin)
        ModPagespeedBeaconUrl /ngx_pagespeed_beacon

        # Image optimization quality settings
        ModPagespeedJpegRecompressionQuality 80

        # Limit the size of inlined resources
        ModPagespeedMaxInlinedPreviewImagesIndex 5
        ModPagespeedMinImageSizeLimitForWebpInCss 0
    </IfModule>
</VirtualHost>
```

## Disable mod_pagespeed for Specific Paths

Some paths should not be processed by mod_pagespeed - admin interfaces, API endpoints, and pages with complex JavaScript:

```apache
<Location "/admin">
    ModPagespeed off
</Location>

<LocationMatch "^/api/">
    ModPagespeed off
</LocationMatch>

# Disable for authenticated users (if your app uses a cookie to indicate login)
<If "%{HTTP_COOKIE} =~ /user_session/">
    ModPagespeed off
</If>
```

## Enable the Statistics Panel (For Debugging)

During initial configuration, the statistics panel helps you see what mod_pagespeed is doing:

```apache
<IfModule pagespeed_module>
    # Enable statistics - restrict to localhost only
    ModPagespeedStatistics on
    ModPagespeedStatisticsLogging on
    ModPagespeedLogDir /var/log/pagespeed
    ModPagespeedMessageBufferSize 100000
</IfModule>

# Restrict the admin and statistics endpoints
<Location /pagespeed_admin>
    Order allow,deny
    Allow from localhost
    Allow from 127.0.0.1
    Allow from 192.168.0.0/16
    SetHandler pagespeed_admin
</Location>

<Location /pagespeed_global_admin>
    Order allow,deny
    Allow from localhost
    SetHandler pagespeed_global_admin
</Location>
```

Access `http://localhost/pagespeed_admin` to see:
- Which filters are active
- Cache statistics (hits, misses, evictions)
- Resource optimization counts
- Rewrite errors

## Configure the Cache

```bash
# Create the cache directory with correct permissions
sudo mkdir -p /var/cache/mod_pagespeed
sudo chown www-data:www-data /var/cache/mod_pagespeed
sudo chmod 750 /var/cache/mod_pagespeed
```

```apache
<IfModule pagespeed_module>
    # Cache size limit (100 MB)
    ModPagespeedFileCacheSizeKb 102400

    # Cache lifetime for optimized resources
    ModPagespeedExpireSpecificationMs 3600000

    # Use a memcached backend for the cache (optional, better for multi-server setups)
    # ModPagespeedMemcachedServers localhost:11211
</IfModule>
```

## Test mod_pagespeed is Working

```bash
# Reload Apache after configuration changes
sudo systemctl reload apache2

# Check that pagespeed headers appear in responses
curl -I http://example.com | grep -i pagespeed

# The X-Mod-Pagespeed header shows the version when active
# X-Mod-Pagespeed: 1.13.35.2-0

# Check the page source to see minified resources and combined files
curl http://example.com | grep -E 'pagespeed|\.pagespeed\.'

# Use Google PageSpeed Insights to measure before and after scores
```

## Purge the Cache

When you deploy new content, purge the pagespeed cache to force re-optimization:

```bash
# Purge all cached assets
sudo find /var/cache/mod_pagespeed/ -type f -delete

# Or use the admin API to flush the cache
curl http://localhost/pagespeed_admin?purge_cache=true

# Restart Apache to fully clear in-memory caches
sudo systemctl restart apache2
```

## Troubleshoot Common Issues

### Broken JavaScript or CSS

If mod_pagespeed's file combining breaks JavaScript execution order or CSS cascade:

```apache
# Disable combining while keeping minification
ModPagespeedDisableFilters combine_javascript,combine_css
```

### Images Not Converting to WebP

Check that the server supports the WebP format:

```bash
# Verify Apache can serve WebP
grep -r 'webp' /etc/apache2/conf-available/
# Or add MIME type
echo "AddType image/webp .webp" | sudo tee /etc/apache2/conf-available/webp.conf
sudo a2enconf webp
```

### High CPU Usage

mod_pagespeed's image optimization is CPU-intensive. Tune it:

```apache
# Limit concurrent image optimizations
ModPagespeedImageMaxRewritesAtOnce 4

# Limit rewrite latency to avoid slowing down first requests
ModPagespeedRewriteDeadlinePerFlushMs 10
```

mod_pagespeed is a high-value addition to any Apache server running a traditional web application. The automatic optimizations can improve page load times by 20 to 50 percent without any changes to application code, which makes it worth the setup time even for sites with active front-end build pipelines.
