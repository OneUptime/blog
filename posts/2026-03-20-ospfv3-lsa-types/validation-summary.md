# Validation Summary: How to Understand OSPFv3 LSA Types for IPv6

## Status
validated

## Post Type
Reference / Guide — explains OSPFv3 LSA types, their scopes, and how to view them on FRRouting and Cisco IOS.

## Technologies Covered
- OSPFv3 (RFC 5340)
- IPv6 routing
- FRRouting (FRR) `ospf6d` daemon and vtysh CLI
- Cisco IOS / IOS XE OSPFv3 CLI
- Mermaid diagrams

## Sources Consulted
- RFC 5340 — OSPF for IPv6: https://datatracker.ietf.org/doc/html/rfc5340
- FRRouting OSPFv3 documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- Cisco IOS XE OSPF Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-s1.html

## Issues Found
1. **FRRouting commands used the wrong CLI prefix.** The post used `show ipv6 ospf database ...`, but FRR's OSPFv3 daemon (`ospf6d`) uses the `ospf6` token in vtysh — the correct form is `show ipv6 ospf6 database ...`. As written, every FRR command in the post would have failed. Updated all seven `vtysh -c` commands in the FRRouting section to use `show ipv6 ospf6 database ...`. The LSA filter tokens (`router`, `network`, `inter-prefix`, `as-external`, `link`, `intra-prefix`) were correct and were preserved.
2. **Inaccurate OSPFv2-to-OSPFv3 LSA mapping in the type table.** The Type 3 row said "(replaces Type 3/4 of OSPFv2)". Per RFC 5340 §2.8, OSPFv3 Type 3 (Inter-Area-Prefix-LSA) is the renamed OSPFv2 Type 3 summary-LSA only; OSPFv2 Type 4 is replaced by OSPFv3 Type 4 (Inter-Area-Router-LSA), which the post lists separately. Changed the parenthetical to "replaces Type 3 summary LSA of OSPFv2".

## Review Notes
- The Cisco command syntax (`show ospfv3 database ...` with subcommands `router`, `network`, `inter-area prefix`, `external`, `link`, `intra-area-prefix`) is valid on Cisco IOS / IOS XE.
- The LSA scope assignments in the table and the Mermaid diagram (Type 8 link-local; Types 1, 2, 3, 4, 7, 9 area; Type 5 AS-wide) match RFC 5340 §4.4.
- The Link LSA contents listed (link-local address, on-link prefixes, router priority, options) are consistent with the Link-LSA fields in RFC 5340 §4.4.3.8.
- Sample CLI output blocks are illustrative rather than verbatim; field names and shape are reasonable for Cisco OSPFv3 output.
- None of the example IPv6 prefixes use real prefix space (all `2001:DB8::/32` documentation prefix per RFC 3849).
