# Validation Summary: How to Configure IPv6 on Cisco IOS-XE Routers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cisco IOS XE
- IPv6
- Neighbor Discovery and Router Advertisements
- DHCPv6 Prefix Delegation
- OSPFv3
- RESTCONF
- YANG models (`ietf-interfaces`, `ietf-ip`)

## Sources Consulted
- Cisco IP Addressing Configuration Guide, Cisco IOS XE 17.x - IPv6 Stateless Autoconfiguration: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-statlss-auto-xe.html
- Cisco IOS IPv6 Command Reference - `ipv6 nd ra dns server`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IP Addressing Configuration Guide, Cisco IOS XE 17.x - IPv6 Access Services: DHCPv6 Prefix Delegation: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-dhcp-prefix-xe.html
- Cisco IOS IPv6 Command Reference - `ipv6 dhcp client pd`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IP Routing Configuration Guide, Cisco IOS XE 17.x - OSPFv3 Address Families: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-ospfv3-add-fam-xe.html
- Cisco IOS IPv6 Command Reference - `router ospfv3`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-r1.html
- Cisco Programmability Configuration Guide, Cisco IOS XE 17.14.x - RESTCONF Protocol: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/prog/configuration/1714/b_1714_programmability_cg/m_1714_prog_restconf.html
- RFC 8040, RESTCONF Protocol: https://www.rfc-editor.org/rfc/rfc8040
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106
- RFC 8344, A YANG Data Model for IP Management: https://www.rfc-editor.org/rfc/rfc8344

## Issues Found
- The description and introduction claimed segment routing coverage, but the post never configured segment routing. I removed that wording so the scope matches the actual content.
- The `ipv6 cef` line was removed from the basic setup because Cisco documents IPv6 CEF behavior differently across IOS XE platforms; presenting it as a universal required step was too broad.
- The RA DNS section had an invalid verification command and release claims that were too broad for IOS XE router coverage. I replaced the verification command with `show ipv6 nd ra dns server`, removed the broad release claims, and simplified the example to documented RDNSS commands.
- The DHCPv6-PD server example was attached to the WAN interface, which is the wrong interface role for a delegating server. I moved the server example to a downstream-facing interface and corrected the PD client example to use Cisco's documented `hint` plus `pd` workflow.
- The OSPFv3 example placed `router-id` under IPv6 address-family configuration mode. Cisco documents `router-id` under `router ospfv3` configuration mode, so I moved it there.
- The RESTCONF example patched the interface list entry with an incomplete payload. I updated it to patch the `ietf-ip:ipv6` container and included the documented IPv6 YANG fields needed for the example.
- The validation ping used a documentation-source prefix toward a live public resolver, which would not work literally. I changed it to an example ping that stays within the documented address space used elsewhere in the post.

## Review Notes
- Cisco's RA DNS command syntax and feature availability vary by IOS XE platform and release. Catalyst platform documentation includes variants with `sequence` fields and different DNSSL syntax, while router-oriented command references document a simpler RDNSS form. The revised post stays within the router-safe subset.
- Cisco platform documentation frequently references RFC 6106 for RA DNS options, while RFC 8106 is the current standards-track document that obsoletes it. The revised post avoids tying the command example to a narrow version claim.
- The RESTCONF example assumes the target IOS XE image exposes the `ietf-interfaces` and `ietf-ip` models and that RESTCONF access has been enabled with appropriate credentials.
