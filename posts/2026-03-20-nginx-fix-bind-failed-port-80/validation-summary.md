# Validation Summary: How to Fix 'bind() to 0.0.0.0:80 Failed' Errors in Nginx

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Nginx (web server)
- Apache HTTP Server (as a conflict example)
- Linux networking utilities (`ss`, `lsof`, `ps`, `pkill`, `kill`)
- systemd / `systemctl` / `journalctl`
- Linux capabilities (`setcap`, `CAP_NET_BIND_SERVICE`)
- `authbind`
- IPv4 / IPv6 dual-stack socket behavior

## Sources Consulted
- Nginx official documentation — Controlling nginx (signals): https://nginx.org/en/docs/control.html
- Nginx `listen` directive reference (ngx_http_core_module): https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx Beginner's Guide / command-line parameters: https://nginx.org/en/docs/beginners_guide.html and https://nginx.org/en/docs/switches.html
- Linux `capabilities(7)` man page (CAP_NET_BIND_SERVICE): https://man7.org/linux/man-pages/man7/capabilities.7.html
- `setcap(8)` man page: https://man7.org/linux/man-pages/man8/setcap.8.html
- iproute2 `ss(8)` man page: https://man7.org/linux/man-pages/man8/ss.8.html
- `lsof(8)` man page: https://man7.org/linux/man-pages/man8/lsof.8.html
- `authbind(1)` man page (Debian): https://manpages.debian.org/bookworm/authbind/authbind.1.en.html
- Linux `ipv6(7)` man page (IPV6_V6ONLY behavior): https://man7.org/linux/man-pages/man7/ipv6.7.html
- systemd `journalctl(1)` man page: https://man7.org/linux/man-pages/man1/journalctl.1.html

## Issues Found
No technical issues found. The diagnostic commands, signal handling (`kill -QUIT` for graceful Nginx shutdown), `setcap cap_net_bind_service=+ep` syntax, `default_server` directive guidance, and the explanation of IPv6 dual-stack overlapping IPv4 are all accurate and aligned with official documentation.

## Review Notes
- The `ss -tlnp | grep ':::80'` pattern works against older iproute2 output formats that render the IPv6 wildcard as `:::80`. Modern iproute2 versions render it as `[::]:80`, so a more portable filter would be `grep -E ':80\b'` or `grep -E '\[::\]:80|:::80'`. The advice still works on many distros, so this was left as-is.
- Cause 3 (Permission Denied) recommends `authbind` and `setcap`. In standard Nginx setups the master process runs as root specifically to bind privileged ports and then drops worker processes to an unprivileged user — so these workarounds typically only apply when running Nginx entirely as a non-root user. The post does not call this out explicitly, but the techniques themselves are correct.
- The PID path `/var/run/nginx.pid` is correct; on systemd-based distributions `/var/run` is a symlink to `/run`, so both `/var/run/nginx.pid` and `/run/nginx.pid` resolve to the same file.
- The `grep -rn 'listen.*:80\|listen 80' /etc/nginx/` alternation relies on GNU grep's BRE extension, which is the default on Linux distributions; it would not be portable to BSD grep without `-E`.
- The conclusion summarizes the six listed causes into four categories (port conflict, permission, IPv6 collision, duplicate config), which is a reasonable consolidation rather than an inconsistency.
