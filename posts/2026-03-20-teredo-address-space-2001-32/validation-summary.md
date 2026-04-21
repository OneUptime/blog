# Validation Summary: How to Understand the TEREDO Address Space (2001::/32) - A Practical Guide

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Teredo
- IPv6 and IPv4 NAT traversal
- UDP encapsulation
- Python `ipaddress` and `socket`
- Windows `netsh`
- Linux `iproute2`
- `iptables` and `ip6tables`
- `tcpdump` and libpcap filters
- 6rd, DS-Lite, MAP-E, MAP-T, and 464XLAT

## Sources Consulted
- RFC 4380: Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs) - https://datatracker.ietf.org/doc/html/rfc4380
- RFC 5991: Teredo Security Updates - https://datatracker.ietf.org/doc/html/rfc5991
- IANA IPv6 Special-Purpose Address Registry - https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- Microsoft Learn: `netsh interface` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: Deprecated features in the Windows client - https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features
- Python `ipaddress` documentation - https://docs.python.org/3/library/ipaddress.html
- Python `socket` documentation - https://docs.python.org/3/library/socket.html
- RFC 5969: IPv6 Rapid Deployment on IPv4 Infrastructures (6rd) - https://datatracker.ietf.org/doc/html/rfc5969
- RFC 6333: Dual-Stack Lite Broadband Deployments Following IPv4 Exhaustion - https://datatracker.ietf.org/doc/html/rfc6333
- RFC 7597: Mapping of Address and Port with Encapsulation (MAP-E) - https://datatracker.ietf.org/doc/html/rfc7597
- RFC 7599: Mapping of Address and Port using Translation (MAP-T) - https://datatracker.ietf.org/doc/html/rfc7599
- RFC 6877: 464XLAT: Combination of Stateful and Stateless Translation - https://datatracker.ietf.org/doc/html/rfc6877
- GitHub author profile link check - https://github.com/nawazdhandala
- Local command validation with Python 3.12.3, tcpdump 4.99.4/libpcap 1.10.4, iptables/ip6tables 1.8.10, and iproute2 6.1.0.

## Issues Found
- The Python decoder extracted the server IPv4 address, flags, and obfuscated port with incorrect right shifts. This decoded the sample address as server `32.1.0.0` instead of `65.54.227.120`. Updated the shifts to match RFC 4380's field order after the 32-bit Teredo prefix.
- The Linux disable note mentioned `ip6tnl0` as though it were a Teredo interface. Updated the comment to refer only to Teredo interfaces.
- The `tcpdump` IPv6 subnet filter used `ip6 src 2001::/32`, which libpcap rejects because CIDR matching requires `net`. Updated it to `ip6 and src net 2001::/32` and verified that it compiles.
- The alternatives table described DS-Lite, MAP-E/MAP-T, and 464XLAT imprecisely. Updated the use cases to distinguish IPv4 service over IPv6 access networks from IPv4 connectivity on IPv6-only networks, and avoided implying that MAP-E is translation.
- The conclusion recommended only 464XLAT or DS-Lite as replacements. Updated it to prefer native IPv6 or the appropriate ISP transition mechanism, including 6rd, MAP-E/MAP-T, DS-Lite, or 464XLAT depending on deployment.

## Review Notes
The post is technically relevant and now validates as a practical Teredo address decoding guide. Teredo remains registered as `2001::/32` in the IANA IPv6 Special-Purpose Address Registry, but Microsoft documentation says Teredo has been disabled by default since Windows 10 version 1803 and recommends native IPv6 support instead.
