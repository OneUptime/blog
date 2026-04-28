# Validation Summary: How to Set Up Nginx to Listen on Multiple IPv4 Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (HTTP server, ngx_http_core_module, ngx_http_access_module, ngx_http_map_module)
- IPv4 networking / multi-homed hosts
- Linux socket inspection (`ss` from iproute2)
- systemd (`systemctl reload`)
- curl

## Sources Consulted
- Nginx `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx `server_name` and virtual hosting: https://nginx.org/en/docs/http/server_names.html
- Nginx `return` directive (including non-standard 444): https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return
- Nginx `map` directive: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx embedded variables (`$server_addr`): https://nginx.org/en/docs/http/ngx_http_core_module.html#var_server_addr
- Nginx access module (`allow`/`deny`): https://nginx.org/en/docs/http/ngx_http_access_module.html
- ss(8) man page (iproute2) for `-4tlnp` flags

## Issues Found
No technical issues found.

## Review Notes
- The `listen` directive precedence behavior is correctly described: a more specific `listen <ip>:<port>` takes precedence over `listen 0.0.0.0:<port>` on the same port for that specific IP.
- `return 444` is Nginx's non-standard code that closes the connection without sending a response — correctly characterized as "Close connection silently".
- The example IPs (203.0.113.0/24 and the RFC1918 ranges) are appropriate documentation/private ranges.
- Worth noting (not an error): by default Nginx will fail to start if a configured IP is not present on the host. Operators may want to add `bind` semantics or use `*:80` for portable configs, but the post's examples assume the IPs are already configured on the host, which is the correct assumption for a multi-homed setup.
- The `map` example using `$server_addr` correctly keys on the local address that received the connection, which is appropriate for IP-based routing.
