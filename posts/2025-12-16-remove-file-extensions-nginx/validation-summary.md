# Validation Summary: How to Remove File Extensions (.php/.html) from URLs in Nginx

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Nginx
- Nginx `try_files`, `location`, `rewrite`, `return`, and `error_page` directives
- Nginx FastCGI configuration for PHP-FPM
- HTTP redirects and query-string handling
- HTTP/2 configuration in Nginx
- SEO redirects and canonical URLs

## Sources Consulted
- Nginx core module documentation: `try_files`, `internal`, `listen`, `root`, and related directives: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx rewrite module documentation: `return`, `rewrite`, `if`, rewrite processing order, and argument handling: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx FastCGI module documentation: `fastcgi_pass`, `fastcgi_param`, and `SCRIPT_FILENAME`: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx HTTP/2 module documentation: current `http2 on;` directive syntax: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx request processing documentation for server and location selection behavior: https://nginx.org/en/docs/http/request_processing.html

## Issues Found
- Some PHP examples used `try_files $uri.php` directly inside `location /`. Nginx processes the first found `try_files` file in the current context, so those snippets could serve PHP source as a static file instead of passing it to PHP-FPM. Changed the examples to route extensionless PHP requests through named FastCGI locations.
- The basic PHP example did not safely handle direct `/file.php` requests after moving extensionless requests to a named location. Added a direct PHP FastCGI location with `try_files $uri =404`.
- The PHP redirect example used `if ($request_uri ~ ^(.+)\.php$)`, which would not match URLs with query strings as intended. Replaced it with a regex `location` redirect and preserved query strings with `$is_args$args`.
- Several redirect examples dropped query strings when redirecting extension URLs to clean URLs. Added `$is_args$args` where those examples used `return`.
- The rewrite example tried to match query strings in the rewrite regex. Nginx rewrite patterns match the URI, not the raw query string; simplified the rewrite patterns and relied on Nginx's documented argument preservation for rewrites.
- Mixed HTML/PHP and rewrite examples attempted to pair `try_files $uri.php` with an `internal` PHP regex location. That does not cause the found PHP file to be executed by the regex location. Replaced those with named FastCGI locations.
- The directory-index PHP example could expose direct PHP requests outside the intended index handling path. Added a direct PHP block returning 404 while keeping `/dir/index.php` redirects.
- The production PHP example allowed a directory existence check inside the named PHP handler even though its `SCRIPT_FILENAME` always targeted `$uri.php`. Removed that mismatched directory check.
- The production PHP `404.php` error page pointed at an internal PHP URI without a FastCGI handler. Replaced it with a named FastCGI error handler.
- The production examples used `listen 443 ssl http2;`, which is deprecated in current Nginx documentation. Updated them to `listen 443 ssl;` plus `http2 on;`.
- The common-issues table recommended `internal` as the solution for redirect loops in a way that did not match the corrected FastCGI routing approach. Updated it to recommend separating public redirects from named internal locations.

## Review Notes
The current HTTP/2 syntax requires Nginx 1.25.1 or newer and the HTTP/2 module. Older Nginx installations may still need the legacy `listen 443 ssl http2;` form, but the post now uses the current non-deprecated syntax.
