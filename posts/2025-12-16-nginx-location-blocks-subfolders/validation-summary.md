# Validation Summary: How to Configure Nginx Location Blocks for Subfolders

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx HTTP server
- Nginx location matching
- Nginx `root`, `alias`, `try_files`, `proxy_pass`, `rewrite`, `map`, and `limit_req` directives
- FastCGI / PHP-FPM configuration
- HTTP caching headers
- Basic authentication
- HTTP/2 configuration
- curl-based debugging

## Sources Consulted
- Nginx `ngx_http_core_module` documentation for `location`, `root`, `alias`, and `try_files`: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx `ngx_http_proxy_module` documentation for `proxy_pass`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx `ngx_http_rewrite_module` documentation for `rewrite` and `return`: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx `ngx_http_headers_module` documentation for `add_header` and `expires`: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx `ngx_http_map_module` documentation for `map`: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx `ngx_http_limit_req_module` documentation for `limit_req` and `limit_req_zone`: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx `ngx_http_v2_module` documentation for `http2 on`: https://nginx.org/en/docs/http/ngx_http_v2_module.html

## Issues Found
- The location matching flow and summary described the precedence as a simple exact > `^~` > regex > standard-prefix order. Nginx actually first finds the longest prefix, then checks regex locations unless the selected prefix is exact or `^~`. Updated the text, diagram, table, and summary to reflect the official algorithm.
- The basic static file example said `/docs` served `/var/www/site/docs`, but the snippet used `alias /var/www/documentation/`. Updated the description to match the actual configured file path.
- The `alias` warning said to always use trailing slashes. This is too broad because regex aliases and non-slash prefix aliases have different patterns. Narrowed the warning to slash-terminated prefix locations.
- The regex API routing example used `proxy_pass` with a URI inside a regex location. Nginx documentation says URI replacement cannot be determined for regex locations, so `proxy_pass` should be specified without a URI in that case. Updated the example to rewrite the URI with `break` and then proxy without a URI.
- The WordPress and documentation subfolder examples used `/blog` and `/docs` prefix locations that could also match paths such as `/blogfoo` or `/docsfoo`. Added exact redirects for the bare paths and changed the main locations to slash-terminated prefixes.
- The "Complete Production Example" used `limit_req zone=api` without defining the `api` shared memory zone or the upstream groups used by `proxy_pass`. Added the required `limit_req_zone`, `api_backend`, and `admin_backend` definitions to make the example complete in an HTTP context.

## Review Notes
Validated representative corrected snippets with `nginx -t` inside an `nginx:alpine` Docker container. The local host did not have an `nginx` binary installed.
