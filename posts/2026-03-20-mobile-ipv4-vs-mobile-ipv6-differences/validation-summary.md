# Validation Summary: How to Understand the Differences Between Mobile IPv4 and Mobile IPv6 (2)

## Status
validated

## Post Type
Comparison / Reference guide

## Technologies Covered
- Mobile IPv4 (MIPv4, RFC 5944)
- Mobile IPv6 (MIPv6, RFC 6275)
- IPsec (ESP/AH) and IKEv2 for binding update protection
- Linux `ip xfrm` policy configuration
- IP-in-IP and IPv6-in-IPv6 tunneling
- SLAAC and DHCPv6 for CoA acquisition
- Foreign Agent / Home Agent architecture
- Return Routability Procedure

## Sources Consulted
- RFC 5944 — IP Mobility Support for IPv4, Revised (https://datatracker.ietf.org/doc/html/rfc5944)
- RFC 6275 — Mobility Support in IPv6 (https://datatracker.ietf.org/doc/html/rfc6275)
- RFC 3775 — Mobility Support in IPv6 (obsoleted by 6275) (https://datatracker.ietf.org/doc/html/rfc3775)
- RFC 4067 — Context Transfer Protocol (CXTP) (https://datatracker.ietf.org/doc/html/rfc4067)
- RFC 3519 — Mobile IPv4 NAT Traversal
- IANA Protocol Numbers (proto 4 = IPv4 encapsulation, proto 41 = IPv6 encapsulation, proto 135 = Mobility Header)
- iproute2 `ip xfrm policy` documentation

## Issues Found
1. **Incorrect DHAAD RFC references in the comparison table.** The original table said:
   - MIPv4: "DHAAD (RFC 3775)" — but RFC 3775 is actually the original Mobile IPv6 specification (since obsoleted by RFC 6275). It is not a Mobile IPv4 document.
   - MIPv6: "DHAAD (RFC 4067)" — but RFC 4067 is the Context Transfer Protocol (CXTP), unrelated to Dynamic Home Agent Address Discovery.

   Replaced with correct citations: MIPv4 dynamic HA address resolution is described in RFC 5944 Section 4.6, and MIPv6 DHAAD is defined in RFC 6275 Section 11.4.1 (originally RFC 3775).

2. **Co-located CoA inaccuracy.** The table claimed co-located CoA in MIPv4 "requires NAT", which is incorrect. Co-located CoA is obtained by the Mobile Node from the foreign network (typically via DHCP) and does not inherently require NAT. NAT traversal (RFC 3519) is a separate concern that arises only when the visited network uses NAT. Reworded to "Supported (DHCP on visited network)".

## Review Notes
- The Mobility Header protocol number (135) and IPv6 encapsulation Next Header (41) are correctly stated.
- The `ip xfrm policy add` example uses plausible iproute2 syntax; `proto 135` (numeric) is accepted, though `proto mh` (mnemonic) is more idiomatic.
- The "Header Overhead" row in the comparison table claims MIPv6 is "Lower" while the migration section shows 80 bytes for IPv6-in-IPv6 vs 40 bytes for IP-in-IP. These are reconcilable: with Route Optimization (the typical MIPv6 operating mode), packets use a Routing Header instead of full encapsulation, which is lighter than MIPv4's bidirectional tunnel — so the table's claim is defensible in context, while the migration section specifically discusses bidirectional tunneling overhead. Left as-is.
- "Foreign Agent: Required for efficiency" for MIPv4 is a reasonable simplification; the FA is technically optional (co-located CoA is the alternative) but is the canonical mode.
- Title contains a "(2)" suffix that appears to be a duplicate-disambiguation marker; left untouched as it does not affect technical correctness.
