# Validation Summary: How to Disable IPv6 in Apache and Listen Only on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- IPv4
- IPv6
- Linux networking
- `ss`
- `curl`
- `sysctl`

## Sources Consulted
- Apache HTTP Server 2.4: Binding to Addresses and Ports — https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server 2.4: An In-Depth Discussion of Virtual Host Matching — https://httpd.apache.org/docs/current/en/vhosts/details.html
- Apache HTTP Server 2.4: Directive Index — https://httpd.apache.org/docs/current/mod/directives.html
- Linux kernel documentation: IPv6 — https://www.kernel.org/doc/html/latest/networking/ipv6.html
- Linux kernel documentation: IP Sysctl — https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- curl man page — https://curl.se/docs/manpage.html
- Local CLI help checked for command syntax: `ss --help`, `sysctl --help`, `curl --help all`

## Issues Found
- The post said Apache listens on IPv6 by default. I corrected this to Apache listening on all addresses by default, with `:::80` presented as a common dual-stack Linux representation rather than the universal default behavior.
- The post implied `Listen 80` universally becomes `:::80`. I narrowed this to many Linux dual-stack systems, matching Apache's documented platform-dependent IPv4-mapped IPv6 behavior.
- The post said `VirtualHost` definitions should be changed from `*:80` to `0.0.0.0:80`. I corrected this because Apache documents that `Listen` controls the listening sockets, while `<VirtualHost>` controls request matching; a name-based `<VirtualHost *:80>` can remain unchanged.
- The post described an `AddressFamily` directive as something some Apache configurations support. I corrected this because Apache's official directive index does not include a standard `AddressFamily` directive for listener family selection.
- The post described the shown sysctl settings as complete kernel-level IPv6 removal. I corrected this to say they disable IPv6 on Linux interfaces, which is what the kernel documentation describes for `disable_ipv6`.
- The verification step used a brittle `grep ':::80'` check and the testing step expected one exact `curl -6` failure string. I replaced these with `ss -4` and `ss -6` checks and noted that the exact IPv6 client error varies with DNS and network conditions.

## Review Notes
- The `Listen 0.0.0.0:80` approach is explicitly documented by Apache as the supported way to force IPv4-only listeners.
- The post is Ubuntu/Debian-oriented because it references `/etc/apache2/ports.conf` and `apache2`; that is technically consistent.
