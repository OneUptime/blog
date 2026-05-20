# Validation Summary: How to Configure Apache mod_rewrite for URL Rewriting on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Apache HTTP Server 2.4
- Apache mod_rewrite
- Apache .htaccess and VirtualHost configuration
- Apache mod_proxy
- curl
- systemd

## Sources Consulted
- Apache HTTP Server 2.4 mod_rewrite documentation: https://httpd.apache.org/docs/2.4/mod/mod_rewrite.html
- Apache HTTP Server 2.4 mod_rewrite introduction: https://httpd.apache.org/docs/2.4/en/rewrite/intro.html
- Apache HTTP Server 2.4 RewriteRule flags documentation: https://httpd.apache.org/docs/current/en/rewrite/flags.html
- Apache HTTP Server 2.4 proxying with mod_rewrite: https://httpd.apache.org/docs/2.4/en/rewrite/proxy.html
- Apache HTTP Server 2.4 mod_proxy documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Ubuntu Server documentation for Apache2 modules: https://documentation.ubuntu.com/server/how-to/web-services/use-apache2-modules/
- Debian a2enmod manual page: https://manpages.debian.org/unstable/apache2/a2enmod.8.en.html

## Issues Found
- The post said `.htaccess` rewrite rules more precisely require `AllowOverride FileInfo Options`. Apache documents `mod_rewrite` directives as `Override: FileInfo`; `Options` is not required for the rewrite directives themselves. Changed the example comment to `AllowOverride FileInfo`.
- The `.htaccess` setup omitted Apache's documented requirement that `Options FollowSymLinks` be enabled for per-directory rewrites. Added `Options FollowSymLinks` and a short explanatory sentence.
- The post said that in VirtualHost config "the full path is matched." Apache documents this as the URL path after the host and before the query string, including a leading slash in VirtualHost context. Changed the wording to "the URL path is matched with a leading `/`."
- `%{REQUEST_URI}` was described as "Full URI with query string." Apache documents it as the requested URI path, with the query string available separately as `%{QUERY_STRING}`. Updated the description.
- `%{REQUEST_FILENAME}` was described unconditionally as the full filesystem path. Apache documents that it is the mapped filesystem path only if that mapping has already been determined; otherwise, for example in VirtualHost context, it can be the same as `%{REQUEST_URI}`. Updated the description.
- `%{HTTPS}` was described as empty for HTTP. Apache documents it as `"on"` for SSL/TLS and `"off"` otherwise. Updated the description.

## Review Notes
The examples are generally accurate when read as `.htaccess`-style rules. In VirtualHost/server context, many `RewriteRule` patterns would need a leading slash because Apache matches the URL path differently there.
