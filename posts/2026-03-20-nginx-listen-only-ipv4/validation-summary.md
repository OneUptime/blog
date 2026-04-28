# Validation Summary: How to Configure Nginx to Listen Only on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (HTTP server, `listen` directive, `ngx_http_core_module`)
- Linux kernel networking (`net.ipv6.bindv6only`, `net.ipv6.conf.*.disable_ipv6` sysctls)
- IPv4 / IPv6 socket binding semantics (IPV6_V6ONLY socket option)
- systemd / `systemctl` (service reload)
- `ss` (iproute2) for verifying listening sockets
- TLS (`ssl_certificate`, `ssl_certificate_key`, `ssl_protocols` TLSv1.2 / TLSv1.3)

## Sources Consulted
- Nginx official documentation for `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen (verified `ipv6only` parameter default is `on` since 0.7.42)
- Linux `ip-sysctl` documentation for `net.ipv6.bindv6only` and `net.ipv6.conf.*.disable_ipv6` semantics
- `ss(8)` and `sysctl(8)` man pages for command syntax (`ss -tlnp`, `sysctl --system`)
- Nginx core module documentation for the directives used in the complete example (`worker_processes`, `worker_connections`, `use epoll`, `sendfile`, `tcp_nopush`, `tcp_nodelay`, `keepalive_timeout`, `default_server`, `try_files`)

## Issues Found
- **Incorrect explanation of default `listen [::]:80` behavior.** The original "Default Nginx Listen Behavior" section claimed that on systems with `net.ipv6.bindv6only = 0`, `listen [::]:80` binds to both IPv4 and IPv6. This is inaccurate for Nginx: since version 0.7.42 the `listen` directive's `ipv6only` parameter defaults to `on`, which sets `IPV6_V6ONLY` on the socket and makes `listen [::]:80` accept only IPv6 connections regardless of the kernel's `bindv6only` setting. Rewrote the section to describe Nginx's actual default behavior (IPv4 socket via `listen 80;`, IPv6-only socket via `listen [::]:80;`) and to note that `ipv6only=off` plus kernel `bindv6only=0` are both required for a dual-stack socket.
- **Misleading inline comment in Method 2.** The comment `# IPv4 only (when bindv6only = 0)` next to `listen 80;` was misleading because `listen 80;` always binds to the IPv4 wildcard `0.0.0.0:80` and is unaffected by the `bindv6only` sysctl. Updated the comment to `# IPv4 only (binds to 0.0.0.0:80)`.

## Review Notes
- The remaining technical content is accurate: explicit IPv4 listen with `0.0.0.0:port`, omitting `listen [::]:port` directives, sysctl-based system-wide IPv6 disable (`net.ipv6.conf.{all,default,lo}.disable_ipv6 = 1`, applied with `sysctl --system`), and verification with `nginx -t`, `systemctl reload nginx`, and `ss -tlnp | grep nginx`.
- The complete `nginx.conf` example uses sound defaults (`TLSv1.2 TLSv1.3`, `default_server`, `try_files`, `worker_connections 1024`, `use epoll`) and is syntactically valid.
- The `ss -tlnp` output sample is slightly abbreviated (omits the State/Recv-Q/Send-Q header row) but accurately represents the IPv4-only listening sockets a user would observe.
- The best-practices section appropriately cautions against disabling IPv6 system-wide and recommends application-level configuration, which aligns with current networking guidance given continued IPv6 adoption.
