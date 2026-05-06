# Validation Summary: How to Configure BGP IPv6 for Internet Exchange Points (IXPs)

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- Internet Exchange Points (IXPs)
- Route servers
- FRRouting (FRR)
- BIRD
- RPKI / Route Origin Validation (ROV)
- IRR-based prefix filtering

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- BIRD User's Guide: https://bird.nic.cz/doc/latest/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737
- RFC 7947, Internet Exchange BGP Route Server: https://www.rfc-editor.org/rfc/rfc7947
- RFC 7948, Internet Exchange BGP Route Server Operations: https://www.rfc-editor.org/rfc/rfc7948
- RFC 7908, Problem Definition and Classification of BGP Route Leaks: https://www.rfc-editor.org/rfc/rfc7908

## Issues Found
- The FRR participant example used invalid IPv6 literals such as `2001:7f8::rs1` and `2001:db8:myorg::/48`, which are not syntactically valid addresses or prefixes. I replaced them with valid documentation-space addresses and prefixes from RFC 3849, and I added the missing `ipv6 prefix-list MY_PREFIXES` definition used by the sample configuration.
- The FRR route-server peering example omitted `no neighbor ... enforce-first-as` for the route-server sessions. FRR enables first-AS enforcement by default, and its own documentation notes that this generally must be disabled when peering with a route server because route servers do not prepend their ASN to `AS_PATH` as described in RFC 7947. I added the per-neighbor disable lines for the two route-server peers.
- The RPKI snippet used outdated/incorrect FRR syntax (`cache 192.0.2.10 3323 preference 1`) and an inaccurate `bgp bestpath prefix-validate allow-invalid` / `disable` comment. I replaced it with current FRR syntax (`rpki cache tcp ...`) and changed the policy example to an inbound route-map that actually rejects `match rpki invalid` routes. I also added the documented `-M rpki` prerequisite note and inbound soft-reconfiguration lines so cache updates can be reapplied correctly.
- The BIRD route-server filter comment claimed the sample was "validating prefixes from members", but the filter only rejected the default route and a few obvious bogon ranges. I corrected the wording so the example accurately describes what it does.
- The overview said IPv6 peering uses the same "address fabric" as IPv4. That is imprecise: the shared element is the Layer 2 switching fabric, while IPv4 and IPv6 use separate peering LAN address plans. I corrected that sentence.
- The best-practices section said to advertise only "your own space". That is too restrictive because operators often advertise customer or otherwise authorized prefixes at an IXP. I corrected the guidance to say participants should advertise prefixes they originate or are authorized to announce and avoid leaking unrelated learned routes.

## Review Notes
- The BIRD example is now technically accurate as a minimal route-server sample, but it still does not implement full production-grade policy controls such as automated IRR generation, explicit RPKI checks in BIRD filters, or NEXT_HOP validation as discussed in RFC 7948.
- The participant section now disables FRR's default IPv4-unicast behavior so the example stays focused on IPv6-only IXP peering.
- Validation in this review was documentation- and RFC-based. FRR and BIRD binaries were not executed in this environment.
