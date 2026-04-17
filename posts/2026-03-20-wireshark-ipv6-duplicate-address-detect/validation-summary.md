# Validation Summary: How to Analyze IPv6 Duplicate Address Detection in Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (display filter syntax)
- IPv6 Duplicate Address Detection (DAD)
- ICMPv6 Neighbor Discovery Protocol (NDP) — Neighbor Solicitation (Type 135) and Neighbor Advertisement (Type 136)
- tcpdump (BPF / packet capture filters)
- Linux iproute2 (`ip -6 addr`, `ip monitor neigh`)
- dhclient (DHCPv6)

## Sources Consulted
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (DAD procedure, Section 5.4): https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4291 — IP Version 6 Addressing Architecture (solicited-node multicast address format): https://datatracker.ietf.org/doc/html/rfc4291
- Wireshark display filter reference for ICMPv6: https://www.wireshark.org/docs/dfref/i/icmpv6.html
- tcpdump / pcap-filter(7) man page: https://www.tcpdump.org/manpages/pcap-filter.7.html
- iproute2 `ip-address(8)` man page (address states, flush semantics)
- isc-dhcp / dhclient(8) man page (`-6` DHCPv6 mode)

## Issues Found
No technical issues found.

- DAD NS source `::` (unspecified) and destination as the target's solicited-node multicast — matches RFC 4862 §5.4.2.
- Solicited-node multicast address `ff02::1:ff00:0010` for target `2001:db8::10` — last 24 bits prepended with `ff02::1:ff` — correct per RFC 4291 §2.7.1.
- Default RetransTimer of 1 second and DAD considered successful if no response — correct per RFC 4861 defaults.
- Wireshark filter fields `icmpv6.type`, `ipv6.src`, `ipv6.dst`, `icmpv6.nd.ns.target_address`, `icmpv6.nd.na.target_address`, and `eth.src` are all valid Wireshark display filter field names.
- `tcpdump ... 'ip6 src :: and icmp6[0] == 135'` — offset 0 of the ICMPv6 header is the Type field, so this correctly matches Neighbor Solicitations. Valid BPF expression.
- Linux address states `TENTATIVE` and `DADFAILED` are valid `ip -6 addr` states; `permanent` is shown by iproute2 when the address has no preferred/valid lifetime expiration, so the grep pattern is serviceable.
- `ip -6 addr flush dev eth0 scope global` and `dhclient -6 eth0` are valid iproute2 / isc-dhcp syntax.

## Review Notes
- Per RFC 4862 §5.4.3, DAD also fails if the node receives a *Neighbor Solicitation* for the same target (from another host performing DAD simultaneously), not only an NA. The post focuses on the NA case, which is the most commonly observed conflict signal and is not incorrect, just narrower.
- The "Normal DAD Sequence" shows an unsolicited NA sent at T=1.000s. This is optional and implementation-dependent; many host stacks silently begin using the address without sending a gratuitous NA. Not incorrect, but readers should not expect every successful DAD to produce a trailing NA.
- `DupAddrDetectTransmits` (default 1) is not called out explicitly; on systems where it is tuned higher (e.g., 2 or 3), multiple DAD probes will be sent before the address is considered unique. Worth noting in a future revision.
