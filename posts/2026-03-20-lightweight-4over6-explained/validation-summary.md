# Validation Summary: How to Understand Lightweight 4over6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Lightweight 4over6 (lw4o6)
- Dual-Stack Lite (DS-Lite)
- MAP-E
- MAP-T
- DHCPv6 Softwire46 provisioning
- Linux `iproute2` tunnels
- Linux `iptables` SNAT

## Sources Consulted
- RFC 7596: Lightweight 4over6: An Extension to the Dual-Stack Lite Architecture - https://www.rfc-editor.org/rfc/rfc7596.txt
- RFC 7598: DHCPv6 Options for Configuration of Softwire Address and Port-Mapped Clients - https://www.rfc-editor.org/rfc/rfc7598.txt
- RFC 6333: Dual-Stack Lite Broadband Deployments Following IPv4 Exhaustion - https://www.rfc-editor.org/rfc/rfc6333.txt
- RFC 6334: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) Option for Dual-Stack Lite - https://www.rfc-editor.org/rfc/rfc6334.txt
- RFC 7597: Mapping of Address and Port with Encapsulation (MAP-E) - https://www.rfc-editor.org/rfc/rfc7597.txt
- `ip -6 tunnel help` on local `iproute2` 6.1.0
- `iptables -j SNAT -h` on local `iptables` 1.8.10 (nf_tables)
- `ip-tunnel(8)` man page - https://manpages.debian.org/testing/iproute2/ip-tunnel.8.en.html
- `iptables-extensions(8)` man page - https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The lwAFTR lookup example used the packet source `203.0.113.5:1500` for inbound traffic. RFC 7596 Section 6.2 says inbound lookup uses the IPv4 destination address and port, so the sentence was corrected.
- The DHCPv6 provisioning section listed the wrong options for lw4o6. It incorrectly used DS-Lite AFTR-Name Option 64 and unrelated option numbers instead of the RFC 7598 Softwire46 options, so it was replaced with `OPTION_S46_BR` (90), `OPTION_S46_V4V6BIND` (92), and `OPTION_S46_PORTPARAMS` (93) inside `OPTION_S46_CONT_LW`.
- The Linux tunnel commands used incorrect `iproute2` forms for IPv4-in-IPv6. `mode ip4ip6`, `mode ip6ip6`, and `remote any` were not accurate for the current `ip -6 tunnel` syntax used here, so the examples were updated to `ip -6 tunnel add ... mode ipip6` static lab tunnels.
- The lwAFTR Linux section implied plain `iproute2` setup was sufficient for an lwAFTR. The post was corrected to note that binding-table and port-set validation require dedicated lwAFTR software, while `iproute2` can still be used for static lab tunnels.
- The NAT example included an overly specific PSID annotation and a plain ICMP SNAT rule that did not represent lw4o6 ICMP behavior accurately. The PSID note was removed, the example was limited to TCP/UDP port-restricted SNAT, and a note was added that production lwB4 implementations must follow RFC 7596 / RFC 5508 ICMP handling.
- The diagram described the lwAFTR as doing "stateless decapsulation", which was misleading because lw4o6 still keeps per-subscriber binding state and also encapsulates inbound IPv4 traffic. The wording was corrected to reflect binding lookup plus encapsulation/decapsulation with no NAT state.

## Review Notes
- The Linux command blocks remain illustrative lab examples, not a complete production lw4o6 deployment recipe.
- `iptables` is still valid on current Linux systems, but many distributions implement it through the `nf_tables` backend.
