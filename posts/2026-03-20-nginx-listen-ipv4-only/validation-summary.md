# Validation Summary: How to Configure Nginx to Listen Only on IPv4 Addresses

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (web server)
- IPv4 / IPv6 networking
- Linux sysctl (kernel networking parameters)
- systemd (systemctl service management)
- iproute2 (`ss` command)
- TLS/SSL listener configuration

## Sources Consulted
- Nginx `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx beginner's guide: https://nginx.org/en/docs/beginners_guide.html
- Linux `ss` command (iproute2) man page: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `sysctl` man page and IPv6 kernel parameters (`Documentation/networking/ip-sysctl.rst`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- systemd `systemctl` man page: https://man7.org/linux/man-pages/man1/systemctl.1.html

## Issues Found
No technical issues found.

- `listen 80;` correctly binds to IPv4 only (equivalent to `0.0.0.0:80`) per Nginx docs.
- `listen 0.0.0.0:80;` is a valid explicit IPv4 binding.
- `listen 443 ssl;` is the current recommended syntax for SSL listeners (the older `ssl on;` directive has been deprecated in favor of the `ssl` parameter on `listen`).
- `ss -tlnp | grep nginx` correctly lists TCP listening sockets with process info.
- `net.ipv6.conf.all.disable_ipv6 = 1` plus `sysctl -p` is the correct way to disable IPv6 system-wide via `/etc/sysctl.conf`.
- `nginx -t` and `systemctl reload nginx` are the correct test-and-reload workflow.
- The example `ss` output format matches actual `ss -tlnp` output columns.

## Review Notes
- Since Nginx 1.3.4, IPv6 listen sockets default to `ipv6only=on`, so an IPv6 listener will not also accept IPv4 connections via v4-mapped addresses. The post's premise (omit `[::]` listeners to be IPv4-only) is consistent with this behavior.
- The "Disable IPv6 in nginx.conf" example shows `listen 443 ssl;` without the corresponding `ssl_certificate` and `ssl_certificate_key` directives, but the trailing `# ... rest of config` comment makes clear this is a partial snippet — not a technical error.
- Disabling IPv6 system-wide via sysctl is a more drastic measure than per-server `listen` configuration; readers should be aware this affects all services on the host, not just Nginx. The post correctly frames this as an alternative ("If IPv6 is disabled system-wide...").
