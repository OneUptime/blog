# Validation Summary: How to Configure Nginx Upstream Servers with IPv4 Addresses

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Nginx (`ngx_http_upstream_module`)
- Nginx `upstream` block configuration
- Load balancing methods (round-robin, `least_conn`, `ip_hash`)
- Server parameters (`weight`, `backup`, `max_fails`, `fail_timeout`)
- IPv4 networking
- systemd (`systemctl reload`)
- Bash brace expansion and `curl`

## Sources Consulted
- Nginx official documentation: `ngx_http_upstream_module` (https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- Nginx admin guide: HTTP load balancing (https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)
- Nginx `proxy_pass` directive documentation (https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)
- Nginx CLI reference: `nginx -t` for configuration testing
- systemd service management documentation for `systemctl reload`

## Issues Found
No technical issues found.

All directives, parameters, and syntax shown in the post match the official Nginx documentation:
- `upstream` block placed in `http` context — correct
- `server <address>:<port>` directive syntax — correct
- `weight=N` parameter for weighted round-robin — correct
- `least_conn` directive — correct (default load balancing method is round-robin if no method directive is specified)
- `ip_hash` directive for client-IP-based sticky sessions — correct
- `backup` parameter marks a server as a fallback only used when all primary servers are unavailable — correct
- `max_fails=3 fail_timeout=30s` for passive health checks — correct (this is the open-source Nginx passive health check mechanism)
- `proxy_pass http://backend;` referencing the upstream by name — correct
- `proxy_set_header Host $host;` and `proxy_set_header X-Real-IP $remote_addr;` — correct standard reverse-proxy header forwarding
- `nginx -t` to test configuration syntax — correct
- `systemctl reload nginx` to reload without dropping connections — correct
- Bash `for i in {1..10}; do ... done` brace expansion — correct

## Review Notes
- Active health checks (`health_check` directive) are an Nginx Plus / commercial feature; the post correctly limits itself to passive health checks (`max_fails`/`fail_timeout`), which work in open-source Nginx.
- The `ip_hash` method only considers the first three octets of an IPv4 address (or the full IPv6 address), which is fine for the post's purpose but a useful detail if expanded later.
- When using a load balancing method directive (`least_conn`, `ip_hash`, `hash`, `random`), the directive must appear before the `server` lines or before the section that depends on it; the examples follow this convention.
- The `backup` parameter is incompatible with `hash`, `ip_hash` (in some versions), and `random` load balancing methods — not relevant to the examples shown but worth noting if the post is later extended.
- The introduction's claim that explicit IPv4 addresses "avoid DNS resolution of hostnames to IPv6 addresses" is accurate — when a hostname is used in a `server` directive, Nginx resolves it at startup and may pick an AAAA record; using a literal IPv4 address bypasses this entirely.
