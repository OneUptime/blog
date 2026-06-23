# Validation Summary: How to Fix Trailing Slash Issues in Nginx proxy_pass

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Nginx
- Nginx reverse proxy configuration
- `proxy_pass`
- HTTP status codes
- `curl`
- `tcpdump`

## Sources Consulted
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- NGINX Reverse Proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
- Nginx core module documentation for normalized URI and slash merging behavior: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx logging module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx debugging log documentation: https://nginx.org/en/docs/debugging_log.html
- RFC 9110, Section 15.6.3, 502 Bad Gateway: https://datatracker.ietf.org/doc/html/rfc9110#section-15.6.3

## Issues Found
- The quick reference table incorrectly said `location /api` with `proxy_pass http://backend/` sends `/api/users` to `//users`. Current Nginx behavior sends `/users`, which also matches the earlier example in the post. Updated the table entry.
- The regex-location section said static URI values are not allowed, then introduced captured groups without clarifying that this works by constructing the full upstream URI with variables rather than using normal location-prefix replacement. Tightened the wording.
- The logging section was labeled "Enable Debug Logging", but the example used `log_format` and `access_log`, not Nginx debug logging. Renamed it to access logging and adjusted the description.
- The common error table described `502 Bad Gateway` as "Backend not receiving expected path". RFC 9110 defines 502 as an invalid upstream response from a gateway/proxy scenario, so the likely cause was changed to an unavailable, unreachable, or invalid-response backend.

## Review Notes
The main `proxy_pass` URI replacement behavior, prefix-stripping examples, rewrite example with `break`, header examples, `curl` command, and `tcpdump` command are technically valid. I also performed a local syntax check with the official `nginx:stable` container to confirm that a static URI in a regex `location` fails while a variable-built upstream URI using a captured group is accepted.
