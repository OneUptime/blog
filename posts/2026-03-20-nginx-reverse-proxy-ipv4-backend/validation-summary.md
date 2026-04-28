# Validation Summary: How to Set Up Nginx as a Reverse Proxy with IPv4 Backend Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (ngx_http_proxy_module, ngx_http_upstream_module, ngx_http_ssl_module)
- HTTP/HTTPS reverse proxying
- WebSockets proxying (HTTP/1.1 Upgrade)
- IPv4 networking
- systemd (`systemctl reload nginx`)
- curl

## Sources Consulted
- Nginx ngx_http_proxy_module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_upstream_module docs: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx ngx_http_ssl_module docs: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx WebSocket proxying guide: https://nginx.org/en/docs/http/websocket.html
- Nginx HTTPS configuration: https://nginx.org/en/docs/http/configuring_https_servers.html

## Issues Found
- The comment on `proxy_read_timeout` originally read "Timeout for reading response headers". This is inaccurate. Per the official Nginx documentation, `proxy_read_timeout` defines the timeout between two successive read operations from the proxied server (not specifically for response headers). Updated the comment to "Timeout between successive reads from backend" to match the documented behavior.

## Review Notes
- All directives (`proxy_pass`, `proxy_set_header`, `proxy_connect_timeout`, `proxy_read_timeout`, `proxy_send_timeout`, `proxy_buffering`, `proxy_buffer_size`, `proxy_buffers`, `proxy_busy_buffers_size`, `proxy_http_version`) are valid and current.
- The WebSocket proxying pattern (proxy_http_version 1.1 + Upgrade/Connection headers) matches the official Nginx WebSocket guide.
- The `X-Forwarded-For` header construction with `$proxy_add_x_forwarded_for` is the correct idiom.
- The `listen 443 ssl;` directive is valid. With Nginx 1.25+, the recommended modern style is `listen 443 ssl;` plus a separate `http2 on;` directive when HTTP/2 is desired, but HTTP/2 is not in scope for this post.
- The implicit/explicit `http {}` block in the upstream example is a stylistic choice and is correct for illustrating where the `upstream` block belongs in `nginx.conf`.
- The example uses self-managed certificates at `/etc/nginx/ssl/`; readers using Let's Encrypt would substitute the certbot-managed paths. This is a stylistic choice, not an error.
