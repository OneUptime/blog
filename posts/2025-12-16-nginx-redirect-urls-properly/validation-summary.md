# Validation Summary: How to Redirect URLs Properly in Nginx

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Nginx
- HTTP redirects and status codes
- Nginx rewrite module
- Nginx map module
- Nginx HTTP/2 configuration
- curl
- Bash

## Sources Consulted
- Nginx ngx_http_rewrite_module documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx ngx_http_map_module documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_geoip_module documentation: https://nginx.org/en/docs/http/ngx_http_geoip_module.html
- RFC 9110, HTTP Semantics: https://datatracker.ietf.org/doc/html/rfc9110
- Local curl help output for `-L`, `-I`, `-s`, and `-i` flags.

## Issues Found
- The post used deprecated `listen 443 ssl http2;` syntax throughout the Nginx examples. Updated those snippets to current Nginx syntax using `listen 443 ssl;` plus `http2 on;`, matching the `ngx_http_v2_module` documentation for Nginx 1.25.1 and later.
- Several map-based redirect examples keyed maps on `$request_uri`. That includes the query string, so exact path mappings would not match URLs with query parameters and regex captures could accidentally include the query string. Changed those maps to use `$uri` and appended `$is_args$args` in the redirect target where query-string preservation was intended.
- The query-parameter removal snippet attempted to mutate `$args` and then used a rewrite that would drop the query string entirely. Replaced it with a simpler redirect that removes tracking query parameters by redirecting to the clean path.
- The second domain migration example listened on HTTPS without showing the required certificate directives. Added `ssl_certificate` and `ssl_certificate_key` to keep the example complete.
- The redirect status diagram used overly absolute SEO wording for 301 and 302. Replaced it with HTTP-focused language consistent with RFC 9110, including that 301 is heuristically cacheable and 302 is temporary.

## Review Notes
The examples are now technically sound for current Nginx documentation. The `if` directives shown only perform `return`, which is an accepted use within Nginx rewrite-module contexts, but future edits should avoid expanding those examples into more complex logic inside `if` blocks.
