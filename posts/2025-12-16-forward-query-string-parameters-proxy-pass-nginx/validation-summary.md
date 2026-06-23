# Validation Summary: How to Forward Query String Parameters Through proxy_pass

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Nginx
- Nginx `proxy_pass`
- Nginx `rewrite`
- Nginx variables: `$args`, `$is_args`, `$request_uri`, `$arg_*`
- Nginx `map`, `try_files`, named locations, and reverse proxy configuration
- curl

## Sources Consulted
- Nginx `proxy_pass` directive documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx rewrite module documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx core module embedded variables documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#variables
- Nginx `try_files` documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files
- Nginx location and named location documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#location

## Issues Found
- The rewrite example claimed `rewrite ^/api/(.*)$ /v2/$1 break;` lost the query string. Official Nginx rewrite documentation says previous request arguments are appended unless the replacement explicitly prevents it. I changed the incorrect example to use a trailing `?`, which is the documented way to discard the original arguments, and clarified that removing the trailing `?` preserves them.
- The static query-string example implied Nginx might forward `http://backend/query?type=search?q=nginx`. A `proxy_pass` URI with its own query string replaces the original request arguments instead of producing a malformed double-question-mark URL. I updated the example and kept the `map` solution for explicitly merging arguments.
- The `$args` section showed two `proxy_pass` directives in the same `location`, which would be invalid configuration. I split the examples into separate locations and corrected the `$request_uri` example to avoid duplicating the path prefix.
- The query-parameter removal example used broad string rewrites that could match parameter names containing `token` and leave malformed separators. I replaced it with a more constrained `map` example and added a caveat that complex or repeated query parameters should be handled with application code or a query-aware module.
- The Basic API Gateway example mutated `$args` with two `if` directives in a way that duplicated the tracking parameters for requests that originally had no query string. I replaced it with a `map`-based merge.
- The overview diagram implied that `proxy_pass` with a URI generally needs explicit query-string handling. I adjusted it to match Nginx behavior: the location path is replaced and the query string is preserved unless explicitly changed.

## Review Notes
Local `nginx -t` validation was not available because Nginx is not installed in this environment. The configuration behavior was reviewed against official Nginx documentation instead.
