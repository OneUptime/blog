# Validation Summary: How to Understand RA Guard for Rogue Router Advertisement Prevention

## Status
validated

## Post Type
Guide / Conceptual explainer (with verification commands)

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- ICMPv6 Router Advertisement (Type 134)
- RA Guard (RFC 6105) — basic and enhanced/stateful modes
- SEND (RFC 3971) — CGA, RSA signatures, PKI
- Cisco IOS first-hop security CLI
- tcpdump / radvd / ndisc6 verification tooling
- Mermaid diagram for deployment architecture

## Sources Consulted
- [RFC 6105 — IPv6 Router Advertisement Guard](https://www.rfc-editor.org/rfc/rfc6105)
- [RFC 7113 — Implementation Advice for IPv6 Router Advertisement Guard (RA-Guard)](https://www.rfc-editor.org/rfc/rfc7113)
- [RFC 3971 — SEcure Neighbor Discovery (SEND)](https://www.rfc-editor.org/rfc/rfc3971)
- [RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)](https://www.rfc-editor.org/rfc/rfc4861) (hop-limit = 255 rule)
- [Cisco IOS IPv6 Command Reference — show ipv6 nd raguard policy](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s4.html)
- [radvd(8) man page (Arch / Debian)](https://man.archlinux.org/man/extra/radvd/radvd.8.en) — confirms `-c, --configtest`
- [NVD CVE-2011-2176](https://nvd.nist.gov/vuln/detail/CVE-2011-2176) — confirmed unrelated to RA Guard

## Issues Found

1. **Incorrect CVE reference.** The post described the IPv6 Extension Header / fragmentation evasion attack as the "CVE-2011-2176 class". CVE-2011-2176 is in fact a GNOME NetworkManager PolicyKit authorization bug and has no relation to RA Guard. The canonical reference for the extension-header / fragmentation evasion of RA Guard is RFC 7113 (which describes both attack vectors and the implementation advice to mitigate them). I changed the wording from "CVE-2011-2176 class" to "RFC 7113 evasion class".

2. **Incorrect Cisco IOS command syntax.** The post listed `show ipv6 nd raguard interface GigabitEthernet0/1`. Per the Cisco IOS IPv6 Command Reference, the correct syntax is `show ipv6 nd raguard policy [interface type number]` — `interface` is an optional qualifier on the `policy` subcommand, not a top-level subcommand of `show ipv6 nd raguard`. I corrected the line to `show ipv6 nd raguard policy interface GigabitEthernet0/1`.

## Review Notes

- The tcpdump filter `icmp6 and ip6[40] == 134` is correct for the common case (no IPv6 extension headers between the fixed header and ICMPv6). With extension headers present the offset would shift; a more robust filter would be `icmp6 and icmp6[0] == 134`, but the form shown is the canonical one in tcpdump documentation and works for unfragmented RAs.
- The "Level 1 / Level 2" terminology for basic vs. enhanced RA Guard is informal — RFC 6105 itself uses the terms "stateless" and "stateful" RA-Guard, and Cisco docs describe a similar split. The post's framing conveys the concept correctly even if the labels are author-chosen.
- The hop-limit-must-be-255 check (RFC 4861 §6.1.2) is correctly described as part of enhanced inspection; this is a standard NDP packet-validity check that any spec-compliant inspection must apply.
- The Rogue RA attack scenario, the Router Lifetime = 0 invalidation behavior, and the link-local-only requirement are all accurate per RFC 4861.
- The SEND comparison is fair: vendor support for SEND is in fact very limited in shipping enterprise gear, and the per-message RSA cost is a real deployment concern.
- The advice to combine RA Guard with DHCPv6 Guard and IPv6 Source Guard for full first-hop coverage matches Cisco's First Hop Security architecture and the IETF SAVI work.
