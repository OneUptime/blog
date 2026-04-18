# Validation Summary: How to Understand 6VPE: IPv6 VPN over MPLS

## Status
validated

## Post Type
Technical guide / tutorial (architecture + Cisco IOS configuration reference)

## Technologies Covered
- 6VPE (IPv6 VPN Provider Edge) — RFC 4659
- BGP/MPLS L3VPN (RFC 4364)
- MP-BGP with VPNv6 address family (SAFI 128)
- MPLS label stacking (LDP transport label + VPN label)
- VRF (Virtual Routing and Forwarding)
- Route Distinguishers (RD) and Route Targets (RT)
- Cisco IOS / IOS-XE configuration syntax

## Sources Consulted
- RFC 4659 — "BGP-MPLS IP Virtual Private Network (VPN) Extension for IPv6 VPN" (https://datatracker.ietf.org/doc/html/rfc4659)
- RFC 4364 — "BGP/MPLS IP Virtual Private Networks (VPNs)" (https://datatracker.ietf.org/doc/html/rfc4364)
- RFC 4760 — "Multiprotocol Extensions for BGP-4" (MP-BGP address families)
- RFC 3107 / RFC 8277 — "Carrying Label Information in BGP-4"
- Cisco IOS XE IPv6 VPN over MPLS (6VPE) configuration guide
- Cisco IOS BGP command reference (show bgp vpnv6, address-family vpnv6)
- Cisco IOS MPLS command reference (show mpls forwarding-table vrf)

## Issues Found
No technical issues found.

Specific items verified:
- RFC 4659 correctly cited as the standard defining 6VPE.
- Two-label MPLS stack description (outer transport label from LDP/RSVP, inner VPN label from MP-BGP) matches RFC 4659 section 3.
- RD format "ASN:NN or IP:NN" is an accurate simplification of RFC 4364 Type 0/1/2 RD formats.
- RT import/export semantics described correctly.
- Cisco IOS modern multi-protocol VRF syntax is correct:
  - `vrf definition <name>` + `address-family ipv6` + `route-target` (current syntax, replacing legacy `ip vrf` and `ipv6 vrf` forms).
  - `vrf forwarding <name>` on interface (current syntax, replacing `ipv6 vrf forwarding`).
  - `address-family vpnv6` under `router bgp` — valid shorthand for `address-family vpnv6 unicast`.
  - `neighbor X send-community extended` is correctly required for RT (extended community) propagation.
  - `address-family ipv6 vrf <name>` for PE-CE BGP peering is correct.
- Verification commands all valid:
  - `show bgp vpnv6 unicast all [summary|labels]`
  - `show ipv6 route vrf <name>`
  - `show mpls forwarding-table vrf <name>`
  - `ping vrf <name> ipv6 <dst> source <src>`
  - `traceroute vrf <name> ipv6 <dst>`
- Documentation prefixes (2001:db8::/32) used correctly per RFC 3849.
- ASN 65000 and 65001 are within the private ASN range — appropriate for examples.

## Review Notes
- The post uses a Python code fence for the RD/RT conceptual block (section "VPNv6 Address Family"); the content is not actual Python but narrative text with structured examples. This is a stylistic choice and not a technical error.
- The author could optionally mention that 6VPE requires the PE loopback used as BGP next-hop to be reachable over MPLS (LDP/RSVP) and that Penultimate Hop Popping (PHP) applies to the outer transport label — but the current post is accurate without this detail.
- The example uses the same RD (65000:100) on both PEs for the same customer, which is a common and valid design; however, RFC 4364 permits distinct per-PE RDs for the same VRF to aid troubleshooting/BGP path diversity. Not an error, just a design choice worth noting.
- Command `show bgp vpnv6 unicast all labels` is correct on modern IOS/IOS-XE; older IOS versions used `show ip bgp vpnv6 ...` — current syntax shown is the modern form.
