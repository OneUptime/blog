# Validation Summary: How to Troubleshoot 6PE and 6VPE Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- IPv6
- 6PE
- 6VPE
- MPLS
- MP-BGP and VPNv6
- Cisco IOS/IOS XE operational commands
- Junos routing tables
- VRF, RD, and Route Target troubleshooting

## Sources Consulted
- RFC 4798: Connecting IPv6 Islands over IPv4 MPLS Using IPv6 Provider Edge Routers (6PE) - https://datatracker.ietf.org/doc/rfc4798/
- RFC 4659: BGP-MPLS IP Virtual Private Network (VPN) Extension for IPv6 VPN - https://datatracker.ietf.org/doc/html/rfc4659
- RFC 4364: BGP/MPLS IP Virtual Private Networks (VPNs) - https://datatracker.ietf.org/doc/rfc4364/
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4379: Detecting Multi-Protocol Label Switched (MPLS) Data Plane Failures - https://datatracker.ietf.org/doc/html/rfc4379
- IANA MPLS LSP Ping Parameters registry - https://www.iana.org/assignments/mpls-lsp-ping-parameters
- Cisco IOS IPv6 Configuration Guide: Implementing IPv6 over MPLS - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/15-0s/ipv6-15-0s-book/ipv6-over-mpls.html
- Cisco ASR 901 Configuration Guide: IPv6 over MPLS: 6PE and 6VPE - https://www.cisco.com/c/en/us/td/docs/wireless/asr_901/Configuration/Guide/b_asr901-scg/b_asr901-scg_chapter_0101000.html
- Cisco IOS IPv6 Command Reference: show bgp ipv6 labels - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_11.html
- Cisco IOS MPLS LSP Ping/Traceroute documentation - https://www.cisco.com/c/en/us/td/docs/ios/mpls/configuration/guide/12_2sr/mp_12_2sr_book/mp_ldp_te_lsp_vccv.html
- Juniper Junos routing table documentation - https://www.juniper.net/documentation/us/en/software/junos/static-routing/topics/topic-map/config_junos_routing_table.html

## Issues Found
- Several example IPv6 prefixes used non-hex labels such as `site-a`, `site-b`, and `pe1-ce1`, which are not valid IPv6 addresses. Replaced them with valid RFC 3849 documentation-prefix examples under `2001:db8::/32`.
- The 6PE BGP and label examples showed a plain IPv4 next hop and `imp-null/16`. Updated the examples to use the IPv4-mapped IPv6 next-hop format (`::FFFF:10.0.0.2`) and a more accurate learned-route label display (`nolabel/16`) consistent with Cisco examples.
- The labeled-unicast guidance attributed Junos `family inet6 labeled-unicast` syntax to Cisco. Split the guidance into Cisco IOS `neighbor ... send-label` and Junos `family inet6 labeled-unicast`.
- The LDP binding example implied local and remote labels should both be label 16. Revised it to state that local and remote bindings should exist, while label values can differ or be implicit-null.
- The VRF section said to verify that the RD "matches." Updated the wording because Route Targets control import/export membership; the RD identifies the VPN route and does not need to match between PEs.
- The MPLS MTU guidance said label overhead was "4-8 bytes per label." Corrected this to 4 bytes per MPLS label.
- The end-to-end LSP OAM commands used `ping mpls ipv6` and `traceroute mpls ipv6` against the IPv6 customer prefix. For classic 6PE/6VPE over IPv4-signaled LSPs, the transport LSP check should target the IPv4 BGP next-hop, so the commands were changed to `ping mpls ipv4 10.0.0.2/32` and `traceroute mpls ipv4 10.0.0.2/32 verbose`.
- The common-error section treated MPLS return code 3 as a failure. RFC/IANA return-code definitions identify code 3 as an egress/success condition, so the example was changed to return code 4, which indicates no FEC mapping.
- Replaced `ping6` and shell `echo` lines in the Cisco-oriented procedure with Cisco-style comments and `ping ipv6`.

## Review Notes
Some Cisco operational commands vary by IOS, IOS XE, IOS XR, and platform release. The corrected commands align with documented Cisco IOS/IOS XE 6PE/6VPE behavior and classic IPv4-signaled MPLS transport; operators using IOS XR, SR-MPLS, or IPv6-signaled LSPs may need platform-specific OAM syntax.
