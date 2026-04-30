# Validation Summary: How to Configure IPv6 Access Control Lists on Cisco IOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Cisco IOS / IOS XE IPv6 ACLs
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- OSPFv3
- BGP

## Sources Consulted
- Cisco, "Security Configuration Guide: Access Control Lists, Cisco IOS XE Gibraltar 16.12.x - IPv6 Access Control Lists" https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_data_acl/configuration/xe-16-12/sec-data-acl-xe-16-12-book/ip6-acls-xe.html
- Cisco, "Cisco IOS IPv6 Command Reference - permit (IPv6)" https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_10.pdf
- Cisco, "Cisco IOS IPv6 Command Reference - show ipv6 access-list" https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_11.html
- Cisco, "Cisco IOS IPv6 Command Reference - clear ipv6 access-list" https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_01.html
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification" https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" https://www.ietf.org/ietf-ftp/rfc/rfc4861.txt.pdf
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls" https://www.rfc-editor.org/rfc/rfc4890.html

## Issues Found
- The overview stated IPv6 ACLs are stateless without qualification. Cisco documents reflexive IPv6 ACLs with `reflect` and `evaluate`, so this was corrected to "by default" and updated to mention reflexive ACLs and ZBF for session-aware filtering.
- The sample management and peer IPv6 prefixes used invalid hexadecimal groups (`FD00:MGMT::/48` and `2001:DB8:PEER::/48`). These were replaced with valid documentation/example prefixes.
- The basic and router-protection examples restricted all Neighbor Discovery traffic to `FE80::/10`. RFC 4861 allows Router Solicitations and Neighbor Solicitations with an unspecified source address, and Neighbor Advertisements are not limited to link-local source addresses, so those entries were widened accordingly. Router Advertisements were kept link-local sourced.
- The ICMPv6 named type example used `echo`, but Cisco's documented ACL keyword is `echo-request`. The example was corrected.
- The "router protection" ACL said it should be applied inbound on all interfaces. As written, that would also affect transit traffic; the note was corrected to position it as a control-plane matching ACL or something to merge into a broader interface ACL.
- The routing protocol comments were inaccurate: the example only permits IPv6 protocol 89 (OSPFv3), not IS-IS, and the multicast destination labels were tightened to match the actual OSPFv3 groups. The invalid ICMPv6 type `8` example was also removed because ICMPv6 echo request is type 128, not 8.
- The verification section showed an explicit deny line that was not actually configured in the basic ACL. The sample `show ipv6 access-list` output was updated to reflect configured entries and Cisco's documented sequence-number display.
- The counter-clear command was wrong. Cisco documents `clear ipv6 access-list [name]`, not `clear ipv6 access-list counters [name]`, so the command was fixed.
- The editing section incorrectly claimed IPv6 ACLs do not support sequence numbers. Cisco documents sequence numbering for IPv6 ACL entries, so that statement was corrected.

## Review Notes
- Cisco documents implicit `permit icmp any any nd-na` and `permit icmp any any nd-ns` behavior for many IOS releases, but examples were left explicit where useful because platform behavior and operator intent can vary.
- The post is now technically correct at a general Cisco IOS/IOS XE level, but production ACLs still need platform-specific validation for exact release and feature support.
