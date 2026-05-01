# Validation Summary: How to Enable IPv6 Forwarding on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux kernel networking sysctls
- `sysctl` / `sysctl.d`
- Router Advertisements (RA) and SLAAC
- `iproute2`
- `tcpdump`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- `sysctl(8)` manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- `sysctl.d(5)` manual page: https://man7.org/linux/man-pages/man5/sysctl.d.5.html
- `ping(8)` iputils manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862

## Issues Found
- The post stated that IPv6 forwarding is only global and that `net.ipv6.conf.all.forwarding` is the only forwarding switch. Current Linux kernel documentation also provides per-interface `net.ipv6.conf.<interface>.force_forwarding`. I corrected that section to reflect the documented per-interface control.
- The verification example used `ping6`, while current iputils documentation treats `ping` with `-6` as the supported interface and `ping6` as a compatibility alias. I updated the example to `ping -6`.
- The verification example also referred to a `192.168.1.x` network while demonstrating IPv6 forwarding. I removed that IPv4-specific note to avoid protocol confusion.

## Review Notes
- `accept_ra=2` on an upstream interface is technically correct when IPv6 forwarding is enabled and the router still needs to learn a default route from Router Advertisements.
- The `sysctl -p /etc/sysctl.d/...` and `sysctl --system` examples are valid on current Linux userspace, though exact boot-time loading behavior depends on the installed `sysctl`/`systemd-sysctl` implementation.
