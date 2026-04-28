# Validation Summary: How to Understand NDP Address Resolution (Replacing ARP)

## Status
validated

## Post Type
Tutorial / Reference guide — comparison of IPv4 ARP and IPv6 NDP address resolution with debugging commands.

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- Neighbor Solicitation (NS) / Neighbor Advertisement (NA) (ICMPv6 types 135/136)
- IPv4 ARP (EtherType 0x0806)
- Solicited-node multicast (ff02::1:ff00:0/104)
- Linux `iproute2` neighbor cache (`ip -6 neigh`)
- Linux Neighbor Unreachability Detection (NUD) states
- tcpdump BPF filters for ICMPv6
- ip6tables for IPv6 firewalling
- Python 3 (illustrative arithmetic)

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861 (verified Hop Limit 255 requirement §7.1.1/§11.2, NS/NA semantics, NUD state machine §7.3.2)
- RFC 4291 — IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291 (verified solicited-node multicast format §2.7.1)
- RFC 4443 — ICMPv6 specification: https://datatracker.ietf.org/doc/html/rfc4443 (verified ICMPv6 message structure)
- RFC 826 — ARP: https://datatracker.ietf.org/doc/html/rfc826 (verified EtherType 0x0806)
- iproute2 `ip-neighbour(8)` man page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html (verified `show`, `del`, `flush` syntax)
- tcpdump pcap-filter(7) man page: https://www.tcpdump.org/manpages/pcap-filter.7.html (verified `ip6[40]` byte-offset filter syntax)
- IANA ICMPv6 type registry: https://www.iana.org/assignments/icmpv6-parameters (verified types 135/136)

## Issues Found
No technical issues found.

## Review Notes
- The Python `import socket` line is unused but harmless — left as-is per the "fix only what is wrong" guidance.
- The arithmetic in `explain_solicited_node_efficiency` is a heuristic approximation rather than a closed-form expected-collision count, but it produces sensible numbers and the prose around it ("on average", "usually 0–1 collision") is appropriately hedged.
- The ARP cache "default ~20 min Linux" parenthetical is approximate — Linux `gc_stale_time` defaults to 60s, though entries can persist longer when the cache is below `gc_thresh1` and GC is not pressured. The author's `~` qualifier covers this variance, so no change made.
- The tcpdump filter `icmp6 and (ip6[40] == 135 or ip6[40] == 136)` works on links without IPv6 extension headers (the normal case for NS/NA on a local segment). For pathological cases with extension headers it would miss matches, but documenting that is out of scope for this post.
- `ping6` is still available on most distributions but is being phased out in favor of `ping -6` on systems using iputils ≥ s20161105. Both forms work today; consider noting `ping -6` in a future revision.
