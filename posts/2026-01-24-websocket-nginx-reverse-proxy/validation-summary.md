# Validation Summary: How to Configure WebSocket with Nginx Reverse Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket
- Nginx reverse proxy
- TLS/SSL termination
- Nginx load balancing
- Nginx rate limiting and connection limiting
- curl
- websocat

## Sources Consulted
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx log module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx upstream/load-balancing documentation: https://nginx.org/en/docs/http/load_balancing.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX Plus HTTP health checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- Local curl help output for `-H, --header`

## Issues Found
- The debug logging snippet placed `log_format` inside a `server` block. Nginx documents `log_format` as valid only in the `http` context, so the snippet would fail configuration validation. Moved `log_format` outside the `server` block in the example.
- The `curl` WebSocket test used `Sec-WebSocket-Key: dGVzdGtleQ==`, which decodes to fewer than the 16 bytes required by RFC 6455. Replaced it with the RFC example key `dGhlIHNhbXBsZSBub25jZQ==`.

## Review Notes
The WebSocket upgrade headers, conditional `map` pattern, `proxy_read_timeout` guidance, `ip_hash` load-balancing behavior, passive health-check notes, and NGINX Plus active health-check caveat are consistent with the official documentation. Nginx is not installed in this environment, so I could not run `nginx -t` against the snippets locally.
