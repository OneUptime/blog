# Validation Summary: How to Design IPv6 for Hyperscale Data Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- BGP
- FRRouting (FRR)
- BGP unnumbered
- Clos network design
- Linux ECMP sysctl tuning
- SLAAC
- DHCPv6
- Anycast
- gNMI/gRPC telemetry

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 7404, Using Only Link-Local Addressing inside an IPv6 Network: https://www.rfc-editor.org/rfc/rfc7404
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 3736, Stateless Dynamic Host Configuration Protocol (DHCP) Service for IPv6: https://www.rfc-editor.org/rfc/rfc3736
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106

## Issues Found
- Invalid IPv6 example addresses were used in the fabric diagram and BGP examples. `2001:db8:rack1::10`, `2001:db8:rack1::/48`, and `2001:db8:anycast::53/128` are not valid IPv6 literals because `rack1` and `anycast` are not hexadecimal hextets. I replaced them with valid documentation-prefix examples.
- The FRR BGP unnumbered example used `neighbor fabric interface remote-as external`, which is not a clear or correct interface-based example as written. FRR documents interface-based unnumbered peers using the interface name as the neighbor identifier, so I changed the snippet to use `swp1` consistently and aligned the advertised prefix with the rack subnet example.
- The anycast FRR snippet used `address-family ipv6` without the explicit `unicast` SAFI used in FRR’s documented examples. I updated it to `address-family ipv6 unicast` and added `exit-address-family` for a complete, consistent example block.

## Review Notes
- The ECMP sysctl commands are valid. In the Linux kernel documentation, `net.ipv6.fib_multipath_hash_policy=1` selects Layer 4 hashing, and the host environment here currently reports the default as `0`.
- The SLAAC plus stateless DHCPv6 guidance is technically valid per RFC 4862 and RFC 3736. Router Advertisement DNS options from RFC 8106 are also a standards-based alternative for DNS delivery, but the post’s current wording is still correct.
- The FRR `network` statements in the examples assume the corresponding prefix already exists in the routing table, which is normal for illustrative BGP snippets and does not require a content change here.
