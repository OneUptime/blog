# Validation Summary: How to Configure Nginx with Multiple IPv4 Addresses

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (HTTP server, listen directive, upstream module, SSL/SNI, default_server)
- iproute2 (`ip addr` command)
- Linux network configuration (Netplan on Ubuntu/Debian, ifcfg scripts on RHEL/CentOS)
- systemd (`systemctl reload`)
- ss (socket statistics) and curl

## Sources Consulted
- Nginx `ngx_http_core_module` documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html (listen, server_name, default_server, return)
- Nginx `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html (upstream, keepalive)
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html (proxy_pass, proxy_http_version, proxy_set_header)
- iproute2 `ip-address(8)` man page (ip addr add/show syntax)
- Netplan documentation: https://netplan.io/reference (Ubuntu/Debian config path)
- RFC 5737 (TEST-NET-3 documentation address ranges 203.0.113.0/24)
- curl(1) man page (`-H`, `--cacert` flags)

## Issues Found
No technical issues found.

All technical claims and code samples are accurate:
- `ip addr show` and `ip addr add 203.0.113.20/24 dev eth0` are correct iproute2 syntax.
- Nginx `listen IP:port` syntax is correct, including multiple `listen` directives in a single server block.
- `try_files $uri $uri/ =404;` is the canonical static-file fallback.
- The upstream keepalive setup correctly pairs `keepalive 32;` with `proxy_http_version 1.1;` and `proxy_set_header Connection "";` — both are required for keepalive to work with HTTP proxying.
- `return 444;` is a valid nginx-specific code that closes the connection without sending a response.
- `default_server` on `listen ... ssl default_server;` is correctly placed on only one server block per IP:port pair.
- `ss -tlnp | grep nginx`, `nginx -t && systemctl reload nginx`, and the `curl -H "Host: ..."` invocations are all correct.
- The example IP ranges 203.0.113.0/24 are from RFC 5737 TEST-NET-3, appropriate for documentation.
- Config paths `/etc/netplan/01-netcfg.yaml` (Ubuntu/Debian) and `/etc/sysconfig/network-scripts/ifcfg-eth0:1` (legacy RHEL/CentOS) are accurate.

## Review Notes
- Configuration 4 is titled "SSL SNI with Multiple IPs" but the example only demonstrates two server blocks on a single IP (203.0.113.10:443) using SNI. The configuration shown is correct, but the section title slightly oversells the example. Per review scope this is a stylistic/structural concern, not a technical error, so no change was made.
- The `curl -H "Host: admin.internal.example.com" https://10.0.0.5/` test will work for the configuration shown (one server block on 10.0.0.5:443), but in general for SNI-based testing, `curl --resolve admin.internal.example.com:443:10.0.0.5 https://admin.internal.example.com/` is more robust because curl uses the URL hostname (not the `-H` value) for SNI. This is not strictly an error in this post's context.
- On RHEL/CentOS 8+ (and especially RHEL 9), the legacy `ifcfg-*` network-scripts have been deprecated in favor of NetworkManager keyfiles (`/etc/NetworkManager/system-connections/`). The `network-scripts` package may need to be installed manually. This is a minor caveat readers on newer distros should be aware of, but the path shown is still valid where the legacy stack is present.
- Since nginx 1.25.1, `http2` is configured via a separate `http2 on;` directive rather than as a `listen` parameter. The post does not use HTTP/2, so this does not affect any of the examples.
