# Validation Summary: How to Configure IPv4 Access Control Lists on a Cisco Router

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- IPv4 access control lists (ACLs)
- Cisco VTY access control with `access-class`
- Interface ACL application with `ip access-group`
- Time-based ACLs
- TCP, UDP, ICMP, and RFC 1918 filtering

## Sources Consulted
- Cisco IOS XE 17 IP Access List Overview: https://www.cisco.com/c/en/us/td/docs/routers/asr920/configuration/guide/sec-data-acl/17-1-1/b-sec-data-acl-xe-17-1-asr920/b-sec-data-acl-xe-17-1-asr920_chapter_00.html
- Cisco IOS XE 17 ACLs Configuration Guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/security/acls/acls-configuration-guide/access-control-lists.html
- Cisco Support: Configure IP Access Lists: https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html
- Cisco IOS XE 17 VRF Awareness Access Class Line: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/application-services/b-application-services/m-bba-vrf-aware-access-class-line.html
- Cisco IOS Security Command Reference, `clear ip access-list counters`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/a1/sec-a1-cr-book/sec-cr-c2.html
- Cisco IOS Security Command Reference, `show ip access-lists`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-cr-book/sec-cr-s4.html
- RFC 1918, Address Allocation for Private Internets: https://www.rfc-editor.org/rfc/rfc1918

## Issues Found
- The WAN-facing extended ACL had permit entries whose source and destination fields did not match the stated application direction. The example was applied inbound on the WAN interface, but several ACEs were written as if they were matching outbound client traffic. I corrected the ACL so the permitted traffic is directionally valid for WAN ingress.
- The RFC 1918 source-blocking entries were below broad permit entries. Because Cisco ACLs stop at the first match, those private-source denies could be bypassed by earlier permits. I moved the RFC 1918 denies ahead of the permits.
- The final deny entry was labeled as an implicit deny even though `deny ip any any log` is an explicit ACE. I corrected the comment.
- The conclusion said ACLs should always be placed close to the source and inbound. Cisco documentation distinguishes between standard ACLs and extended ACLs here. I corrected the placement guidance and softened the logging recommendation to selective use of `log`.

## Review Notes
- The VTY example using a named ACL is valid on current Cisco IOS XE documentation. Older Cisco IOS documentation sometimes required numbered ACLs for some VTY use cases.
- The `established` keyword matches TCP packets with ACK or RST set; it is not a stateful firewall feature. The revised comment now reflects that behavior.
- Time-based ACLs depend on an accurate device clock. Cisco recommends synchronizing the router clock with NTP for reliable enforcement.
