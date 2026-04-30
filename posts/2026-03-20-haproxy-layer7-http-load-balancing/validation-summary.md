# Validation Summary: How to Configure HAProxy Layer 7 HTTP Load Balancing with IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HAProxy
- HTTP and HTTPS
- WebSocket
- IPv4
- ACL-based content routing
- Stick tables and request rate limiting

## Sources Consulted
- HAProxy Configuration Manual 3.0: https://docs.haproxy.org/3.0/configuration.html
- HAProxy Configuration Manual 2.8: https://docs.haproxy.org/2.8/configuration.html

## Issues Found
- The `web_servers` health check used the deprecated pattern of appending `Host` after the `option httpchk` version string. I changed it to `option httpchk GET /health HTTP/1.1` plus `http-check send hdr Host www.example.com`, which matches the current HAProxy manual.
- The `use_backend` rules routed `/api/` and `/static/` before checking the WebSocket ACL. Because HAProxy evaluates `use_backend` rules in declaration order and picks the first match, WebSocket requests could be shadowed by earlier path rules. I moved `use_backend ws_servers if is_websocket` above the path-based rules.
- The later examples redefined `frontend https_in`, which would conflict with the existing named frontend in a real HAProxy configuration. I converted those examples into additive snippets that explicitly belong inside the existing `https_in` frontend.
- The inline comment for `option redispatch` implied mid-request failover. I corrected it to describe retrying another server after a failed connection attempt, which better matches HAProxy behavior.

## Review Notes
- `timeout tunnel 1h` is technically appropriate for upgraded WebSocket connections. HAProxy also documents `timeout client-fin` as a useful companion timeout for long-lived tunnels, but the post's current example remains valid without it.
