# Validation Summary: How to Calculate Wildcard Masks from Subnet Masks

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv4 subnet masks and wildcard masks
- CIDR notation
- Cisco ACLs
- Cisco OSPF
- Cisco NAT
- Python standard library modules: `socket`, `struct`, and `ipaddress`

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- Cisco, "Configure IP Access Lists": https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html
- Cisco IOS XE 17 OSPF Configuration Guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr3-fwd/ospf/ospf-configuration-guide/ospf.html
- Cisco IOS XE 17 NAT Configuration Guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr3-fwd/nat/nat-configuration-guide/nat.html
- RFC 950, "Internet Standard Subnetting Procedure": https://datatracker.ietf.org/doc/html/rfc950

## Issues Found
No technical issues found.

The post's core explanations were verified against official sources:

- Python documents `IPv4Network.hostmask` as the host mask and explicitly notes that host masks are the logical inverse of net masks and are used, for example, in Cisco ACLs.
- The `socket.inet_aton()`, `socket.inet_ntoa()`, `struct.pack()`, and `struct.unpack()` APIs used in the code examples are current, non-deprecated standard library APIs.
- Cisco documentation confirms that ACL wildcard masks are inverse masks where `0` bits must match and `1` bits can vary.
- Cisco OSPF documentation uses the `network address wild-card-mask area area-id` syntax, so the claim about OSPF network statements is correct.
- Cisco NAT documentation shows ACL-driven NAT examples using `access-list ... permit source [source-wildcard]`, so the NAT reference is also accurate.

Both Python code snippets were executed locally and produced the expected wildcard-mask outputs.

## Review Notes
- Python notes that `socket.inet_aton()` may accept some non-canonical IPv4 forms depending on the underlying C implementation. The blog's examples use standard dotted-decimal subnet masks, so the code is correct as written for the inputs shown.
- Cisco ACL wildcard masks can also be noncontiguous, but this post is specifically about calculating wildcard masks from standard subnet masks, so its inverse-of-subnet focus is appropriate.
