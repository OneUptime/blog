# Validation Summary: How to Understand IPv4-Mapped IPv6 Addresses (::ffff:0:0/96)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4
- Dual-stack sockets
- Python `ipaddress`
- Python `socket`
- Linux `IPV6_V6ONLY` / `bindv6only`
- Linux `iptables` / `ip6tables`

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture" - https://www.rfc-editor.org/rfc/rfc4291
- RFC 3493, "Basic Socket Interface Extensions for IPv6" - https://www.rfc-editor.org/rfc/rfc3493
- RFC 4942, "IPv6 Transition/Co-existence Security Considerations" - https://www.rfc-editor.org/rfc/rfc4942
- RFC 5156, "Special-Use IPv6 Addresses" - https://www.rfc-editor.org/rfc/rfc5156.html
- Python `ipaddress` documentation - https://docs.python.org/3/library/ipaddress.html
- Python `socket` documentation - https://docs.python.org/3/library/socket.html
- Linux `ipv6(7)` man page - https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux `ip6tables(8)` man page - https://www.man7.org/linux/man-pages/man8/ip6tables.8.html

## Issues Found
- The Python example comment claimed `print(ipv4_to_mapped("192.168.1.100"))` would print `::ffff:192.168.1.100`. In current Python, `ipaddress.IPv6Address` normalizes `str()` output to compressed hexadecimal form, so the actual output is `::ffff:c0a8:164`. I corrected the comment to match the real output.
- The firewall section incorrectly stated that IPv4 traffic accepted by a dual-stack `AF_INET6` socket would appear in `ip6tables` as `::ffff:192.168.1.1`, and it provided `ip6tables` rules to filter that traffic. RFC 3493 and RFC 4942 describe IPv4-mapped addresses as an API-level representation for IPv4 peers; `iptables` and `ip6tables` filter IPv4 and IPv6 packets separately. I corrected the explanation and replaced the example rules with `iptables` commands that match the actual on-the-wire IPv4 traffic.

## Review Notes
- Local sanity checks matched the documentation: a dual-stack Python `AF_INET6` socket accepted an IPv4 loopback client and exposed it to the application as `::ffff:127.0.0.1`, while `ipaddress.IPv6Address("::ffff:192.168.1.100")` rendered as `::ffff:c0a8:164`.
- The post's Linux-specific statements about `IPV6_V6ONLY` defaulting to `0` are accurate for Linux and are backed by `ipv6(7)` and the kernel `bindv6only` documentation. Other operating systems may use different defaults.
