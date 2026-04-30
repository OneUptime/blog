# Validation Summary: How to Design an IPv6 Addressing Plan for an ISP

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and prefix planning
- ISP address allocation strategy
- BGP route summarization
- Cisco IOS IPv6 BGP configuration
- Python `ipaddress` standard library

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- RFC 6164, Using 127-Bit IPv6 Prefixes on Inter-Router Links: https://datatracker.ietf.org/doc/html/rfc6164
- RIPE NCC, How to Request an IPv6 Allocation: https://www.ripe.net/manage-ips-and-asns/ipv6/request-ipv6/how-to-request-an-ipv6-allocation/
- ARIN Number Resource Policy Manual: https://www.arin.net/participate/policy/nrpm/nrpm.pdf
- Cisco, IPv6 BGP Prefix-Based Outbound Route Filtering Configuration Example: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/113504-ipv6-bgp-outbound-prefixfilter.html
- Cisco, IPv6 prefix-list command reference: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html

## Issues Found
- The sample residential `/56` and peering `/64` examples were not aligned to the actual subnet boundaries produced by the stated parent `/36` blocks. I corrected `2001:db8:1001::/56` to `2001:db8:1000:100::/56` and `2001:db8:f001::/64` to `2001:db8:f000:1::/64` so the examples match real IPv6 subnet math.
- The post claimed a `/36` can provide 65,536 residential `/56` allocations. That is incorrect; a `/36` contains 1,048,576 `/56` prefixes. I corrected the customer-capacity figure.
- The loopback code comment said the `/120` pool provided 256 loopbacks, but the example code uses `IPv6Network.hosts()`, which excludes the Subnet-Router anycast address. I updated the comment to 255 usable loopbacks via `hosts()`, matching Python's documented behavior and the code's actual output.
- The Cisco IOS BGP skeleton placed `neighbor ... remote-as` inside the IPv6 address-family block and used `ip prefix-list` for IPv6 filtering. I moved `remote-as` to router BGP configuration scope, added `neighbor ... activate` under `address-family ipv6 unicast`, and changed the filter to `ipv6 prefix-list` to match Cisco IOS IPv6 BGP syntax.
- The infrastructure bullet in the allocation model implied a single `/48` for all internal use, which conflicted with the rest of the plan that allocates an internal aggregate and carves `/48`s from it. I adjusted the wording to describe infrastructure as `/48`s per PoP or function.

## Review Notes
- `2001:db8::/32` is the documentation prefix defined for examples, so it is appropriate for the post but not routable on the public Internet.
- The Python allocator example is syntactically correct, but it materializes the full subnet list on each allocation call. That is acceptable for a simple illustrative example, though a production allocator would normally avoid rebuilding large lists repeatedly.
