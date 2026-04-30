# Validation Summary: How to Understand IPv6 DAD Transmits Setting on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux kernel IPv6 sysctls
- Duplicate Address Detection (DAD)
- `sysctl`
- `iproute2`
- `tcpdump`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 7527, Enhanced Duplicate Address Detection: https://www.rfc-editor.org/rfc/rfc7527
- `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Local CLI verification on 2026-04-30 with `sysctl --help`, `ip -6 address help`, and `tcpdump -d 'icmp6 and (ip6[40] == 135 or ip6[40] == 136)'`

## Issues Found
- The DAD explanation said the kernel only waits for a Neighbor Advertisement reply. Per RFC 4862, DAD can also fail on conflicting Neighbor Solicitation traffic, so the explanation and diagram were corrected to mention conflicting `NS` or `NA` messages.
- The "When to Disable DAD" section said guaranteed unique MAC addresses were enough justification. That was too broad because DAD protects IPv6 address uniqueness, not just MAC-derived uniqueness, so the guidance was changed to refer to environments where address uniqueness is guaranteed by orchestration or configuration.
- The "Disable globally" example only set `net.ipv6.conf.all.dad_transmits=0`. In Linux, `conf/all/*` changes current interfaces, while `conf/default/*` is needed for future interfaces, so the example was corrected to set both.
- The summary said DAD runs when any IPv6 address is assigned. RFC 4862 scopes DAD to unicast addresses, with exceptions such as `dad_transmits=0`, so the summary was corrected to say DAD runs when a unicast IPv6 address is assigned and DAD is enabled.

## Review Notes
- Linux currently documents `dad_transmits` with a default of `1`.
- Linux also documents `enhanced_dad` as enabled by default, which means DAD Neighbor Solicitations include a nonce option per RFC 7527. The post remains correct without covering that detail, but packet captures may show it.
