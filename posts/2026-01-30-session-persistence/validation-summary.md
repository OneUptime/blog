# Validation Summary: How to Create Session Persistence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NGINX (open source and NGINX Plus `sticky` module)
- HAProxy (cookie-based, IP-based, and application cookie persistence)
- Mermaid diagrams (flowcharts and sequence diagrams)
- Redis / Memcached (mentioned as stateless alternatives)

## Sources Consulted
- NGINX Plus `sticky` directive documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/#sticky
- NGINX `ngx_http_upstream_module` (ip_hash, keepalive, backup, slow_start): https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- HAProxy `cookie` directive documentation: https://docs.haproxy.org/2.8/configuration.html#4.2-cookie
- HAProxy `balance` directive (source, roundrobin): https://docs.haproxy.org/2.8/configuration.html#4.2-balance
- HAProxy `hash-type` documentation: https://docs.haproxy.org/2.8/configuration.html#4.2-hash-type
- HAProxy stick tables and `stick store-response` / `stick match`: https://docs.haproxy.org/2.8/configuration.html#4.2-stick%20store-response
- HAProxy `option forwardfor`, `option httpchk`, `http-check expect`: https://docs.haproxy.org/2.8/configuration.html
- MDN HTTP cookies (HttpOnly, Secure): https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies

## Issues Found
- **Conflicting `balance` directives in the production HAProxy `api_backend`**: The original config declared `balance roundrobin` immediately followed by `balance source`. HAProxy only honors the last `balance` directive in a backend, so `balance roundrobin` was dead/contradictory configuration that misleads readers since the section is explicitly demonstrating IP-based persistence. Fix: removed the redundant `balance roundrobin` line so the backend cleanly uses `balance source` with consistent hashing as intended.

## Review Notes
- The post correctly notes up front that NGINX's `sticky` directive requires NGINX Plus or a third-party sticky module (it is not part of NGINX open source). The follow-up NGINX examples (`sticky learn`, `sticky cookie ... secure`, `slow_start`) implicitly assume NGINX Plus as well — the initial caveat covers this, but a reader skimming later sections might miss it.
- NGINX Plus `sticky cookie` syntax (`name [expires=time] [domain=domain] [httponly] [secure] [path=path]`) and `sticky learn` (`create=...`, `lookup=...`, `zone=...`, `timeout=...`) are accurate.
- HAProxy `cookie SERVERID insert indirect nocache httponly [secure]` and `cookie JSESSIONID prefix nocache` are correct usages of HAProxy's cookie persistence modes (insert vs. prefix).
- HAProxy `balance source` with `hash-type consistent` is the correct way to get IP-based sticky behavior that survives backend pool changes more gracefully than the default map-based hashing.
- The stats CSV columns referenced by `awk -F',' '{print $1, $2, $5, $8}'` correspond to pxname, svname, scur, smax — a reasonable subset for monitoring session distribution.
- The "Comparison Table" claim that cookie-based persistence "works with NAT" is accurate (since the identifier is per-client, not per-IP), and the trade-offs listed for each method match standard guidance.
- No version-specific deprecations: all directives shown remain valid in current NGINX Plus (R30+) and HAProxy (2.x / 3.x) releases as of 2026-06.
