# Validation Summary: How to Configure GLBP for IPv4 Load Balanced Gateways on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- Gateway Load Balancing Protocol (GLBP)
- IPv4 first-hop redundancy
- HSRP
- VRRP
- Cisco object tracking

## Sources Consulted
- Cisco, "IP Addressing Services Configuration Guide, Cisco IOS XE 17.15.x - Configuring GLBP" https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9600/software/release/17-15/configuration_guide/ip/b_1715_ip_9600_cg/configuring_glbp.html
- Cisco, "Cisco IOS First Hop Redundancy Protocols Command Reference - glbp authentication" https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp_fhrp/command/fhp-cr-book/fhp-a1.html
- Cisco, "Cisco IOS IP Application Services Command Reference - glbp weighting / glbp weighting track / glbp timers" https://www.cisco.com/en/US/docs/ios-xml/ios/ipapp/command/D_through_H.html
- Cisco, "Cisco IOS XE IP Commands - show glbp / glbp load-balancing / glbp preempt / glbp priority" https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3850/software/release/16-2/command_reference/b_162_consolidated_3850_cr/b_162_consolidated_3850_cr_chapter_0101.pdf
- RFC Editor, "RFC 9568: Virtual Router Redundancy Protocol (VRRP) Version 3 for IPv4 and IPv6" https://www.rfc-editor.org/rfc/rfc9568

## Issues Found
- The optional third router configuration omitted GLBP authentication even though the other routers used MD5 authentication. A router with mismatched or missing GLBP authentication will not join the group correctly, so the same `glbp 1 authentication md5 key-string GLBPsecret` line was added to Router 3.
- The introduction listed only round-robin and weighted ARP distribution, but GLBP also supports host-dependent load balancing. The sentence was corrected to include all three documented load-balancing methods.
- The verification example was presented in a way that implied `show glbp brief` returns detailed multiline output. The example was corrected to clearly represent abridged `show glbp` output and to use Cisco's documented `forwarder time-out` wording.
- The object-tracking example claimed the router would stop forwarding when weight dropped, but the snippet did not include the lower and upper weighting thresholds required for that behavior. The weighting thresholds were added so the example matches Cisco's documented AVF withdrawal behavior.
- The comparison table cited VRRP as "IETF RFC 5798". RFC 5798 has been obsoleted; the current VRRPv3 standard is RFC 9568, so the table was updated.

## Review Notes
- The GLBP command syntax used in the post is valid for Cisco IOS / IOS XE, including `glbp ... load-balancing`, `glbp ... weighting`, `glbp ... weighting track`, `glbp ... preempt`, and `show glbp`.
- GLBP remains a Cisco proprietary FHRP feature, while VRRP is standards-based. Platform support for GLBP varies across Cisco product lines, so readers should still confirm feature availability on their specific IOS / IOS XE device.
