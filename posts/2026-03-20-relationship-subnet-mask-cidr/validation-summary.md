# Validation Summary: How to Understand the Relationship Between Subnet Mask and CIDR

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing
- CIDR notation
- IPv4 subnet masks and wildcard masks
- Python (`socket`, `struct`, and `ipaddress`)
- Linux `ip`/iproute2 CLI
- Cisco IOS CLI syntax

## Sources Consulted
- RFC 1519, "Classless Inter-Domain Routing (CIDR): an Address Assignment and Aggregation Strategy": https://www.rfc-editor.org/rfc/rfc1519
- RFC 4632, "Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan": https://www.rfc-editor.org/rfc/rfc4632
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- Python `socket` library documentation: https://docs.python.org/3/library/socket.html
- Python `struct` library documentation: https://docs.python.org/3/library/struct.html
- Local `ip addr help` output from the installed `ip` CLI
- Cisco IOS `ip address` command reference: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/ip_address.htm
- Cisco IOS `ip route` command reference: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/ip_route.htm
- Cisco IOS OSPF command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book.pdf
- Cisco IOS routing configuration guide covering BGP `network ... mask ...`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/configuration/15-mt/iri-15-mt-book.pdf
- Cisco ACL documentation on wildcard masks: https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html

## Issues Found
- The `/16` row in the equivalence table showed the wrong binary value for the last two octets. I corrected it from `11111111.00000000` to `00000000.00000000` because `255.255.0.0` ends with `0.0`.
- The historical note incorrectly said CIDR was introduced in RFC 4632 in 1993. I corrected this to RFC 1519 in 1993 and noted that RFC 4632 is the later update from 2006.
- The historical note implied that CIDR introduced explicit masks generally. I tightened that wording to reflect that CIDR made prefix lengths explicit independently of classful boundaries, which is the technically accurate distinction.
- The usage-context rows for BGP and OSPF were too generic. I qualified them as Cisco IOS syntax so the post no longer implies those exact command forms are universal across all BGP or OSPF implementations.
- I tightened the description and takeaway wording to make clear that CIDR equivalence assumes a contiguous IPv4 subnet mask.

## Review Notes
- The Python `mask_to_prefix()` example works for valid contiguous IPv4 subnet masks, but it does not itself reject non-contiguous masks such as `255.0.255.0`. The surrounding text now makes that assumption explicit.
