# Validation Summary: How to Troubleshoot IPv6 Asymmetric Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux routing with iproute2 (`ip route`, `ip rule`)
- Packet capture with `tcpdump`
- Linux firewalling with `ip6tables` and netfilter conntrack
- RFC 6724 IPv6 address selection

## Sources Consulted
- `traceroute(8)` Linux man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- `ip-route(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip-rule(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `iptables-extensions(8)` Linux man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `gai.conf(5)` Linux man page: https://man7.org/linux/man-pages/man5/gai.conf.5.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 6724: https://www.rfc-editor.org/rfc/rfc6724
- conntrack-tools user manual: https://conntrack-tools.netfilter.org/manual.html

## Issues Found
- The post used invalid IPv6 placeholders such as `2001:db8::remote` and `fe80::gw-a`. I replaced them with syntactically valid documentation addresses like `2001:db8:ffff::10`, `fe80::a`, and `fe80::b` so the examples are real IPv6 literals.
- The reverse-path section implied Linux `rp_filter` is an IPv6 setting. I corrected this to note that the `rp_filter` sysctl is IPv4-only and that IPv6 reverse-path checks on Linux are done with the `ip6tables` `rpfilter` match.
- The `mtr bidirectional mode` note was removed because it was not supported by the current command documentation consulted for this review, while reverse-path validation by running the trace from the remote host is accurate.
- The route-listing example `ip -6 route show | awk '{print $NF, $0}'` was removed because the last field is not reliably the egress interface. I replaced it with `ip -6 route show table all`, which accurately exposes the relevant routing tables.
- Step 5 implied `/etc/gai.conf` shows kernel source-address selection policy. I changed the wording to distinguish kernel route selection (`ip -6 route get`) from application-side `getaddrinfo(3)` address sorting controlled by `gai.conf`.
- Step 6 incorrectly suggested an `ESTABLISHED,RELATED` rule fixes asymmetric routing. I replaced that guidance with correct conntrack behavior, a stateless example rule, and `CT --notrack` examples for traffic that cannot be kept symmetric. I also corrected the ECMP note to clarify that ECMP alone does not guarantee symmetric return paths.

## Review Notes
- `ip6tables` remains valid on current Linux systems, but on many distributions it is implemented by the nftables backend. The commands in the post are still syntactically valid as written.
- The policy-routing example is appropriate for Linux multi-homed hosts, but real deployments usually also need persistent configuration in the system's network manager or distro-specific network scripts.
