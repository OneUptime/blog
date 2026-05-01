# Validation Summary: How to Verify EIGRPv6 Routes on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- EIGRPv6
- IPv6
- Routing tables
- EIGRP topology and neighbor verification

## Sources Consulted
- Cisco IOS IPv6 Command Reference, `show ipv6 eigrp neighbors` and `show ipv6 eigrp topology`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html
- Cisco IOS IPv6 Command Reference, `show ipv6 protocols`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_15.html
- Cisco IOS IPv6 Command Reference, `show ipv6 route`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_16.html
- Cisco IOS IP Routing: EIGRP Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/command/ire-cr-book/ire-s1.html
- Cisco Support, EIGRP IPv6 Configuration Example: https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/113267-eigrp-ipv6-00.html
- Author link verification: https://github.com/nawazdhandala

## Issues Found
- The post used bare `show ipv6 eigrp` as a primary process-verification command. Cisco documentation for generic IOS consistently documents `show ipv6 protocols` for viewing active IPv6 routing protocol process state, so I replaced that command with the documented process-level verification command.
- The topology-table description said `show ipv6 eigrp topology` shows all routes including backup paths. Cisco documents that the default output shows only successor and feasible-successor entries; `all-links` is required to include non-feasible paths. I corrected that wording in the command list and summary.
- The external-route example used `2001:DB8:EXTERN::/48`, which is not a valid IPv6 prefix because `EXTERN` contains non-hexadecimal characters. I changed it to the valid documentation-safe prefix `2001:DB8:E::/48`.
- The external-route example labeled the route code as `D EX`. Cisco IPv6 routing-table code definitions use `EX` for EIGRP external routes, so I corrected the sample output and explanation accordingly.

## Review Notes
- Command availability and exact output can vary slightly across Cisco IOS, IOS XE, NX-OS, and ASA. The post now uses command forms and behavior that are documented for Cisco IOS EIGRPv6 verification.
- Cisco platform guides also reference `show ipv6 eigrp` for viewing router IDs on some switch families, but the generic IOS command references used for this review more consistently document `show ipv6 protocols` for process-state verification.
