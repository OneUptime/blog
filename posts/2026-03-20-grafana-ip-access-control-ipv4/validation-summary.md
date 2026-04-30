# Validation Summary: How to Set Up Grafana IP-Based Access Control with IPv4 Ranges

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana
- Nginx
- IPv4 networking
- Linux firewalling
- UFW
- iptables

## Sources Consulted
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana auth proxy documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/auth-proxy/
- Grafana reverse proxy tutorial: https://grafana.com/tutorials/run-grafana-behind-a-proxy/
- NGINX `ngx_http_access_module`: https://nginx.org/en/docs/http/ngx_http_access_module.html
- NGINX `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- Ubuntu `ufw(8)` man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Linux `iptables(8)` man page: https://man7.org/linux/man-pages/man8/iptables.8.html
- Linux `ss(8)` man page: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The introduction and Method 1 implied Grafana itself performs source IP range filtering. I corrected this to distinguish interface binding (`http_addr`) from client IP filtering, which is enforced at the reverse proxy or firewall layer.
- The comment for `domain` said it was used for email links. I corrected it because Grafana documents `domain` as part of `root_url`.
- The reverse proxy example did not align Grafana's public URL with the proxy setup and omitted the documented WebSocket proxy block for Grafana Live. I added `domain`, `root_url`, and an `/api/live/` location with the required proxy headers.
- Method 3 referenced a non-documented `authorized_ip_ranges` setting under `[auth]`. I replaced it with the documented `[auth.proxy] whitelist` behavior and clarified that it only trusts proxy IPs sending auth headers, not end-user client IPs.
- The `iptables` example omitted the specific admin workstation allow rule that the UFW example included. I added the missing `ACCEPT` rule before the final `DROP`.

## Review Notes
- The Nginx example is valid for HTTP on port 80. If the proxy terminates TLS or serves Grafana from a sub-path, Grafana's `root_url` and related proxy configuration need to be adjusted accordingly.
- `ufw deny 3000` blocks both TCP and UDP; if the intent is to target Grafana's TCP listener only, `ufw deny 3000/tcp` is more explicit, though the original command is syntactically valid.
