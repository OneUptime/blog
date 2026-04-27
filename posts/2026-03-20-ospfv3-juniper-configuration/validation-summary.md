# Validation Summary: How to Configure OSPFv3 on Juniper Routers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Juniper JunOS
- OSPFv3 (RFC 5340)
- IPv6 routing
- IPsec authentication for OSPFv3 (RFC 4552)
- Junos `set` command syntax and hierarchical configuration

## Sources Consulted
- Juniper TechLibrary — OSPFv3 configuration reference: https://www.juniper.net/documentation/us/en/software/junos/ospf/topics/ref/statement/ospf3-edit-protocols.html
- Juniper TechLibrary — OSPFv3 stub area example: https://www.juniper.net/documentation/en_US/junos/topics/example/ospf3-stub.html
- Juniper TechLibrary — `ipsec-sa` under `protocols ospf`: https://www.juniper.net/documentation/en_US/junos/topics/reference/configuration-statement/ipsec-sa-edit-protocols-ospf.html
- Juniper TechLibrary — OSPFv3 IPsec transport mode: https://www.juniper.net/documentation/en_US/junos/topics/task/configuration/ipsec-ospfv3-transport-mode-solutions.html
- Juniper TechLibrary — `show ospf3 neighbor`: https://www.juniper.net/documentation/en_US/junos13.2/topics/reference/command-summary/show-ospf-ospf3-neighbor.html
- Juniper TechLibrary — `show ospf3 route`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ospf-ospf3-route.html
- Juniper TechLibrary — OSPF DR priority overview: https://www.juniper.net/documentation/en_US/junos12.3/topics/concept/ospf-routing-designated-router-overview.html
- RFC 5340 — OSPF for IPv6: https://datatracker.ietf.org/doc/rfc5340/
- RFC 4552 — Authentication/Confidentiality for OSPFv3: https://datatracker.ietf.org/doc/rfc4552/
- RFC 4303 — IP Encapsulating Security Payload (SPI reservation): https://www.ietf.org/rfc/rfc4303.txt

## Issues Found

1. **Inaccurate `show ospf3 route` sample output.** The original sample used a non-existent "IPv6-Unicast" value in the Route Type column and showed IPv4 router IDs in the NextHop column. JunOS `show ospf3 route` actually emits a Topology header, separate Path Type / Route Type / NH Type columns (with values like Intra/Inter/Ext1 and Network/Router/Area BR/AS BR/Transit), and prints next-hop info on a continuation line as `NH-interface ... NH-addr fe80::...`. Updated the sample output to match the documented JunOS format with realistic IPv6 link-local next-hops.

## Review Notes
- All configuration syntax (`set protocols ospf3 area ... interface ...`, `passive`, `hello-interval`, `dead-interval`, `metric`, `stub default-metric`, `export <policy>`, `routing-options router-id`) was verified against the Juniper OSPFv3 configuration hierarchy and is current.
- Default OSPF router priority of 128 on Juniper is correct.
- Minimum SPI of 256 is correct (1–255 are reserved per RFC 4303).
- IPsec authentication uses manual SA in transport mode with bidirectional direction and AH protocol — this matches RFC 4552 / Juniper's documented OSPFv3 IPsec implementation. The `hmac-sha1-96` algorithm is supported, though for new deployments AES/SHA-256-based options are generally preferred where available.
- The `show ospf3 neighbor` sample output was left as-is — Router IDs like `2.2.2.2` are valid 32-bit dotted-decimal identifiers (they need not correspond to a configured IPv4 address), and the columns/default priority shown are correct.
- Route redistribution example uses `then accept;` only — for production deployments, explicit `to` filters or more granular policy terms are commonly added, but the example is correct as a minimal template.
