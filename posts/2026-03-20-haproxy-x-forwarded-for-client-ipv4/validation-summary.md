# Validation Summary: How to Configure X-Forwarded-For in HAProxy to Preserve Client IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- HTTP request headers
- `X-Forwarded-For`
- `X-Real-IP`
- Flask
- `curl`
- `jq`

## Sources Consulted
- HAProxy Configuration Manual, `option forwardfor`: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy tutorial, Add an `X-Forwarded-For` header: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/add-x-forward-for-header/
- HAProxy tutorial, HTTP rewrites: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/http-rewrites/
- Flask API docs: https://flask.palletsprojects.com/en/stable/api/
- Flask deployment docs, Tell Flask it is Behind a Proxy: https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Local CLI help output: `curl --help`
- Local CLI help output: `jq --help`

## Issues Found
- The post said that when `X-Forwarded-For` already exists, `option forwardfor` appends the client and proxy chain as a single comma-separated header value. HAProxy’s documentation says it appends another `X-Forwarded-For` header occurrence and that backends should use the last occurrence unless `if-none` is configured. I corrected the explanation and example.
- The `option forwardfor except 127.0.0.1` section described excluding localhost backends. HAProxy documents `except` as matching source addresses, not backend servers. I rewrote the section so it correctly describes requests arriving from localhost.
- The trusted-proxy example manually rebuilt `X-Forwarded-For` with `"%[req.hdr(X-Forwarded-For)],%[src]"`. That was not the safest or clearest way to express a trust boundary, and it could preserve untrusted input incorrectly. I changed it to trust only the CDN source ranges and preserve trusted XFF while removing untrusted client-supplied XFF.
- The conclusion said to always strip client-supplied XFF before adding your own. That is too absolute when HAProxy sits behind trusted upstream proxies. I corrected the conclusion to distinguish edge traffic from trusted proxy paths.

## Review Notes
- The Flask debug endpoint is syntactically valid, and `request.remote_addr` correctly reflects the immediate peer unless proxy-trust middleware such as Werkzeug `ProxyFix` is configured.
- The `curl -s ... | jq .` example uses current CLI syntax. Whether `jq` is installed is environment-specific, but the command itself is valid.
- HAProxy also supports the standardized RFC 7239 `Forwarded` header via `option forwarded`. This post remains technically relevant because `X-Forwarded-For` is still widely deployed.
