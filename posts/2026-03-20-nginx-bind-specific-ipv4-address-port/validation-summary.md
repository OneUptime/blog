# Validation Summary: How to Bind Nginx to a Specific IPv4 Address and Port

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (HTTP server, `listen` directive)
- Linux networking (multi-homed servers, IPv4 addresses)
- `ss` (iproute2) for socket inspection
- `systemctl` for service management
- `curl` for HTTP testing
- TLS/SSL on nginx

## Sources Consulted
- Nginx core module documentation — `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx server block / default_server documentation: https://nginx.org/en/docs/http/server_names.html
- iproute2 / `ss` man page (Linux)
- Nginx ngx_http_ssl_module: https://nginx.org/en/docs/http/ngx_http_ssl_module.html

## Issues Found
No technical issues found.

All examples are syntactically correct and align with the official nginx documentation:
- The `listen address:port;` syntax is valid for binding to a specific IPv4 address.
- The `ssl` parameter on `listen` is correct for HTTPS.
- The `default_server` parameter correctly designates the default server block for an IP:port pair when no `server_name` matches.
- `nginx -t`, `systemctl reload nginx`, and `ss -tlnp | grep nginx` are accurate verification commands.
- The example `ss -tlnp` output format (State, Recv-Q, Send-Q, Local Address:Port, Peer Address:Port, users) is correct.
- The loopback binding (`listen 127.0.0.1:8080;`) is valid.

## Review Notes
- `ss -tlnp` typically requires root/sudo to display process names reliably; the post does not mention this caveat but it does not affect correctness.
- The loopback example uses `proxy_pass http://backend;` without showing an `upstream backend { ... }` block. This is a snippet illustrating the binding concept, not a complete working configuration — readers wanting a runnable example would need to define the upstream or use a literal address. Not a technical error, just a scope limitation.
- IP addresses used in examples (`192.168.1.100`, `10.0.0.10`, `203.0.113.1`, `127.0.0.1`) are appropriate — `203.0.113.0/24` is the TEST-NET-3 documentation range per RFC 5737, and the others are private/loopback.
