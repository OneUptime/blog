# Validation Summary: How to Troubleshoot Nginx IPv6 Binding Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Nginx (listen directive, ipv6only parameter)
- IPv6 networking
- Linux kernel networking (net.ipv6.bindv6only, IPV6_V6ONLY socket option)
- Linux capabilities (CAP_NET_BIND_SERVICE, setcap)
- systemd service unit directives (AmbientCapabilities)
- iproute2 (`ip -6 addr`)
- ss (socket statistics)
- sysctl

## Sources Consulted
- Nginx ngx_http_core_module docs: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Linux errno.h: errno 13 (EACCES), 98 (EADDRINUSE), 99 (EADDRNOTAVAIL)
- Linux kernel networking documentation for `net.ipv6.bindv6only` and `IPV6_V6ONLY` (ipv6(7), RFC 3493 §5.3)
- `man 7 capabilities` for CAP_NET_BIND_SERVICE
- `man setcap`, `man 5 systemd.exec` for AmbientCapabilities
- iproute2 `ip-address(8)` manpage
- `ss(8)` manpage for `-6 -tlnp` flags

## Issues Found
No technical issues found.

## Review Notes
- Error codes 98/99/13 shown in error messages are Linux-specific errno values; on other OSes (BSD/macOS) the numeric codes differ, but the symbolic names (EADDRINUSE, EADDRNOTAVAIL, EACCES) do match. The post correctly targets Linux via `/proc/sys/...` paths.
- In nginx 0.7.42+ (i.e., essentially all modern installations), the `ipv6only` parameter defaults to `on`. So the "EADDRINUSE when both `listen 80;` and `listen [::]:80;` are present" scenario described is primarily a concern only if `ipv6only=off` has been explicitly set or on very old nginx builds. The advice to add `ipv6only=on` is still correct/harmless (defensive), just redundant for default configs.
- Some code fences are labeled `bash` but contain nginx configuration snippets — this is a minor formatting/presentation concern (syntax highlighting), not a technical error, and does not affect correctness.
- `setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx` works for non-root nginx execution, but requires that nginx not subsequently drop the capability during worker fork; distro packages typically keep the master as root and bind before dropping to the worker user, so the setcap approach is most relevant for non-root full nginx runs. The post presents it as one of three valid options, which is accurate.
- The grep pipeline `grep 'listen' /etc/nginx/sites-enabled/* | grep -v '\[' | grep ':'` will also flag legitimate IPv4 `host:port` listeners (e.g., `listen 127.0.0.1:8080;`), so it's a heuristic check rather than a precise detector — acceptable for a quick audit.
