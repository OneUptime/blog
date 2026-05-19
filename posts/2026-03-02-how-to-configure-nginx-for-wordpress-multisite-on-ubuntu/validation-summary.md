# Validation Summary: How to Configure Nginx for WordPress Multisite on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- Nginx
- WordPress Multisite
- PHP-FPM
- MySQL
- TLS/SSL
- FastCGI caching

## Sources Consulted
- WordPress Developer Resources: Nginx Advanced Administration Handbook, including WordPress multisite Nginx examples: https://developer.wordpress.org/advanced-administration/server/web-server/nginx/
- WordPress Developer Resources: Multisite Network Administration, including WordPress 3.5+ rewrite behavior and legacy `/files/` rules: https://developer.wordpress.org/advanced-administration/multisite/administration/
- WordPress Developer Resources: Configuring Wildcard Subdomains: https://developer.wordpress.org/advanced-administration/server/subdomains-wildcard/
- WordPress Developer Resources: WP-CLI `wp core multisite-install`, including multisite constants and subdomain option behavior: https://developer.wordpress.org/cli/commands/core/multisite-install/
- Nginx documentation: `ngx_http_v2_module` `http2` directive: https://nginx.org/en/docs/http/ngx_http_v2_module.html#http2
- Nginx documentation: `ngx_http_core_module` `listen` directive and deprecated `http2` listen parameter: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx documentation: `ngx_http_fastcgi_module`, including FastCGI cache directives and contexts: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Ubuntu Packages: `php8.3-fpm` package in Ubuntu 24.04 LTS (noble): https://packages.ubuntu.com/noble/php8.3-fpm

## Issues Found
- The Nginx examples used `listen 443 ssl http2;`. Current Nginx documentation marks the `http2` parameter on `listen` as deprecated and documents the `http2 on;` directive instead. Updated both TLS server blocks to use `listen 443 ssl;`, `listen [::]:443 ssl;`, and `http2 on;`.
- The subdomain multisite example included a `$blogid` map plus `/files/`, `wp-content/blogs.dir`, and `ms-files.php` handling. WordPress documentation separates those rules as legacy WordPress 3.0-3.4 upload handling; modern WordPress 3.5+ multisite examples do not use them. Removed the legacy map and `/files/` location from the current subdomain configuration.
- The subdomain upload PHP blocking rule only covered legacy `/files/` URLs. Updated it to block PHP execution under `wp-content/uploads`, matching the modern upload path used by WordPress.
- The `wp-config.php` snippet recommended `UPLOADBLOGSDIR`, which is tied to the old multisite upload directory layout. Removed it from the modern WordPress multisite configuration.
- The enablement command was written for only the subdirectory config despite the post providing two separate site files. Adjusted the comment to say to enable the appropriate site configuration.

## Review Notes
- The post is technically relevant and contains substantial implementation details, so it was reviewed as a code/configuration tutorial.
- The examples assume Ubuntu 24.04 LTS or another Ubuntu release where PHP 8.3 packages are available from the configured repositories.
- The PHP-FPM pool sizing values are plausible examples, but production values should be sized to server memory and traffic.
- FastCGI caching is correctly shown as an optional addition, but real WordPress deployments often need cache purge integration and plugin-specific exclusions.
