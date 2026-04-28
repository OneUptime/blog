# Validation Summary: How to Configure Nginx to Proxy WebSocket Connections on IPv4

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (HTTP reverse proxy)
- WebSocket protocol (RFC 6455)
- TLS / HTTPS termination
- Nginx upstream load balancing (`ip_hash`, `keepalive`, `backup`)
- HTTP/1.1 Upgrade mechanism

## Sources Consulted
- Nginx official WebSocket proxying guide: https://nginx.org/en/docs/http/websocket.html
- Nginx `ngx_http_proxy_module` reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_upstream_module` reference: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx `ngx_http_ssl_module` reference: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- RFC 6455 - The WebSocket Protocol
- RFC 7230 - HTTP/1.1 Message Syntax and Routing (defines the Upgrade mechanism)

## Issues Found

1. **Incorrect rationale for `proxy_http_version 1.1` in the directive reference table.**
   The post claimed "Required - HTTP/1.0 does not support keep-alive". This is misleading: HTTP/1.0 does support persistent connections via the `Connection: keep-alive` extension header. The actual reason WebSocket proxying requires HTTP/1.1 is that the `Upgrade` mechanism used by WebSocket is defined in HTTP/1.1 (RFC 7230 §6.7 and RFC 6455). I changed the cell to: "Required - WebSocket's Upgrade mechanism is defined for HTTP/1.1".

2. **Dead `if ($scheme = http)` block inside the `listen 443 ssl` server.**
   The TLS example contained `if ($scheme = http) { return 301 https://$host$request_uri; }` inside a server block that only listens on `443 ssl`. `$scheme` is always `https` in that context, so the redirect could never fire. The post already has a dedicated HTTP→HTTPS redirect server block in the next section, making the inner `if` not just dead but also redundant. Removed the block.

## Review Notes
- The `keepalive` directive in the upstream block is shown but does not provide much value for a pure WebSocket location, since each connection is upgraded and never returned to the keepalive pool. It is harmless and may help if non-upgrade requests share the upstream — left as-is.
- A more robust pattern from the Nginx WebSocket docs uses `map $http_upgrade $connection_upgrade { default upgrade; '' close; }` and then `proxy_set_header Connection $connection_upgrade;`. The post's static `Connection "upgrade"` works because the `/ws` location is dedicated to WebSocket traffic, but readers mixing WebSocket and regular HTTP under one location should prefer the `map`-based approach.
- `ssl_ciphers HIGH:!aNULL:!MD5;` is functional but dated; modern deployments typically follow the Mozilla SSL Configuration Generator recommendations (or rely on TLS 1.3 defaults). Not a correctness issue.
- The title and description emphasize IPv4, but the configuration shown is address-family-agnostic (Nginx's `listen 80;` binds both IPv4 and IPv6 by default; the IPv4-ness comes only from the literal `127.0.0.1` / `10.0.0.x` upstream addresses). This is framing rather than a technical error.
- `ip_hash` plus `backup` is supported in modern Nginx (the incompatibility was removed in 1.3.1 / 1.2.2), so the load-balancing example is valid.
