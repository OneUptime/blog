# Validation Summary: How to Rewrite Large Numbers of URLs with Parameters in Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx HTTP configuration
- Nginx `map` directive
- Nginx rewrite module (`rewrite`, `return`, `if`, `set`)
- Query-string and request-argument variables
- Bash and curl redirect testing
- OpenResty / ngx_http_lua_module

## Sources Consulted
- Nginx `ngx_http_map_module` documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx `ngx_http_rewrite_module` documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx `ngx_http_core_module` embedded variables documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- OpenResty `lua-nginx-module` documentation: https://github.com/openresty/lua-nginx-module/blob/master/doc/HttpLuaModule.wiki
- Local `curl --help` output for `curl -I` and `curl -sI` options

## Issues Found
- The query-string replacement example incorrectly stated that `rewrite ^/old-page$ /new-page?newparam=1 permanent;` replaces the original query string. Per Nginx rewrite documentation, existing request arguments are appended when a replacement contains new arguments unless the replacement ends with an extra `?`. Changed the replacement-only example to `rewrite ^/old-page$ /new-page?newparam=1? permanent;`.
- The append-preserving example manually added `$query_string`, which can duplicate the original arguments because Nginx appends them automatically in this case. Changed it to `rewrite ^/old-page$ /new-page?newparam=1 permanent;`.
- The map matching section said literal `map` strings are case-sensitive by default. Nginx documentation states that map strings are matched ignoring case. Updated the text and examples to show literal case-insensitive matching, case-sensitive regex matching with `~`, and explicit case-insensitive regex matching with `~*`.
- The Method 5 comment described the category map as "category slug to ID" while the snippet maps category IDs to slugs. Updated the comment to match the code.

## Review Notes
Nginx was not installed in the local environment, so `nginx -t` could not be run. The Nginx configuration behavior was validated against official Nginx documentation instead.
