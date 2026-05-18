# Validation Summary: How to Set Up Nginx with WebSocket Support on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (reverse proxy and load balancing)
- WebSocket protocol (RFC 6455)
- Ubuntu (apt package management, systemd)
- TLS/SSL (Let's Encrypt cert paths)
- websocat (CLI WebSocket client)
- curl (HTTP/WS handshake testing)
- ss / ufw (Linux networking utilities)

## Sources Consulted
- Nginx official WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx blog "WebSocket proxying": https://www.nginx.com/blog/websocket-nginx/
- Nginx `ngx_http_proxy_module` reference (proxy_pass, proxy_http_version, proxy_set_header, proxy_read_timeout, proxy_send_timeout, proxy_buffering): https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_upstream_module` reference (`ip_hash`): https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx `ngx_http_map_module` reference: https://nginx.org/en/docs/http/ngx_http_map_module.html
- RFC 6455 (The WebSocket Protocol), particularly Section 1.3 (sample handshake / Sec-WebSocket-Key example "dGhlIHNhbXBsZSBub25jZQ==") and Section 4.1 (HTTP/1.1 requirement)
- websocat GitHub releases page (binary naming `websocat.x86_64-unknown-linux-musl`): https://github.com/vi/websocat/releases
- Nginx changelog confirming WebSocket support was added in 1.3.13 (Feb 2013)

## Issues Found
- **Inaccurate explanation of why HTTP/1.1 is required for WebSocket proxying.** The post originally stated "HTTP/1.0 does not support persistent connections, so WebSockets require at minimum HTTP/1.1." This is misleading — HTTP/1.0 does support persistent connections via the `Connection: keep-alive` header (it just isn't the default), and persistence isn't really the reason here. The actual reasons are: (a) Nginx defaults to HTTP/1.0 when proxying upstream, which doesn't forward the hop-by-hop `Upgrade` / `Connection` headers needed by the WebSocket handshake, and (b) RFC 6455 mandates HTTP/1.1 for the handshake. I rewrote the sentence to reflect both reasons accurately.

## Review Notes
- The `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==` value in the curl example is the canonical example from RFC 6455 Section 1.3 — correct.
- `nginx 1.3.13` as the version that introduced WebSocket support is accurate (released 2013-02-19).
- The `map $http_upgrade $connection_upgrade { default upgrade; '' close; }` pattern matches the official Nginx WebSocket documentation verbatim.
- `ssl_ciphers HIGH:!aNULL:!MD5;` is functional but dated; Mozilla's SSL Configuration Generator (intermediate profile) would be a stronger recommendation. Not technically incorrect, so left as-is per the "fix only technical errors" guideline.
- `listen 443 ssl;` without an `http2` directive is correct for current Nginx (>= 1.25 prefers a separate `http2 on;` directive, but the post's form remains valid).
- `sticky` (mentioned alongside `ip_hash`) is an NGINX Plus / third-party module directive and not in open-source Nginx — but the post only mentions it as a general concept and then demonstrates `ip_hash`, so this is acceptable.
- `curl http://localhost/nginx_status` requires the `stub_status` module to be explicitly configured in a `location` block; the post doesn't mention this prerequisite, which could trip up readers, but it's listed only as a brief monitoring tip in troubleshooting.
- The websocat install commands (`wget -O /usr/local/bin/websocat ...` and `chmod +x ...`) would typically need `sudo` to write to `/usr/local/bin/`, but this is a minor stylistic omission rather than a technical error.
