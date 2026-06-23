# Validation Summary: How to Decode URLs in Nginx proxy_pass

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Nginx
- Nginx `proxy_pass`
- Nginx rewrite module
- Nginx map module
- Nginx embedded variables (`$request_uri`, `$uri`, `$args`, `$is_args`)
- Reverse proxy configuration
- Lua with Nginx/OpenResty
- Bash and curl
- Node.js HTTP server

## Sources Consulted
- Nginx `ngx_http_proxy_module` official documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx `ngx_http_core_module` official documentation, embedded variables and `merge_slashes`: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx `ngx_http_rewrite_module` official documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx `ngx_http_map_module` official documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html#map
- Node.js HTTP module official documentation: https://nodejs.org/api/http.html
- OpenResty lua-nginx-module documentation: https://github.com/openresty/lua-nginx-module

## Issues Found
- The post described Nginx as generally decoding and re-encoding proxied URLs. Updated the default behavior description to match Nginx documentation: `proxy_pass` with a URI uses the normalized request URI, while `proxy_pass` without a URI passes the original request URI unless the URI was rewritten.
- The opening diagram used a query string example in a way that implied Nginx decodes and re-encodes query parameters as part of URI normalization. Changed it to a path example and described upstream URI construction more generally.
- The selective path handling section claimed `rewrite ... break` preserves encoding. Nginx rewrites operate on the request URI and, when used with `break`, pass the changed URI; this does not preserve the original percent encoding. Replaced that solution with a `$request_uri`-based construction.
- Scenario 1 also claimed `rewrite ... break` preserves encoding. Replaced it with a `$request_uri`-based prefix replacement example.
- The double-encoding `map` example was presented as decoding once. Clarified that the shown map only unescapes the first `%25` sequence and that general URL decoding should be handled in application logic or Lua.
- Scenario 3 had two active `proxy_pass` directives in one `location` block. Converted the first option to a commented single-line alternative and left one active `proxy_pass`.
- The proxy behavior summary overstated the no-URI `proxy_pass` behavior as normalized. Updated it to say the original URI is passed unless rewritten.
- The final summary incorrectly recommended `rewrite` with `break` for preserving encoding. Updated it to recommend building the upstream URI from `$request_uri`.

## Review Notes
Nginx was not installed in the local environment, so the snippets were reviewed against official documentation rather than validated with `nginx -t`. The examples use `if` with `set`, which is a supported rewrite-module pattern, but future revisions could avoid `if` by using `map` for more production-oriented configurations.
