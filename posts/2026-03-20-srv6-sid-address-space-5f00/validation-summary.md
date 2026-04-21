# Validation Summary: How to Understand the SRv6 SID Address Space (5f00::/16)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 special-purpose addressing
- SRv6 Segment Identifiers (SIDs)
- Segment Routing Header (SRH)
- SRv6 Network Programming
- FRRouting BGP, filtering, zebra SRv6 locator configuration, and IS-IS SRv6 advertisement
- Linux iproute2 SRv6 route inspection
- Python `ipaddress`

## Sources Consulted
- RFC 9602: Segment Routing over IPv6 (SRv6) Segment Identifiers in the IPv6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc9602.html
- IANA IPv6 Special-Purpose Address Registry - https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 8754: IPv6 Segment Routing Header (SRH) - https://www.rfc-editor.org/rfc/rfc8754.html
- RFC 8986: Segment Routing over IPv6 (SRv6) Network Programming - https://www.rfc-editor.org/rfc/rfc8986.html
- RFC 8402: Segment Routing Architecture - https://www.rfc-editor.org/rfc/rfc8402.html
- FRRouting BGP documentation - https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Filtering documentation - https://docs.frrouting.org/en/latest/filter.html
- FRRouting Zebra SRv6 locator documentation - https://docs.frrouting.org/en/latest/zebra.html
- FRRouting IS-IS SRv6 documentation - https://docs.frrouting.org/en/stable-10.0/isisd.html
- Python `ipaddress` standard library documentation - https://docs.python.org/3/library/ipaddress.html
- Linux `ip route` help output on the review host for `seg6local` action syntax

## Issues Found
- The post described `5f00::/16` as globally routable and marked "Globally Reachable" as true. RFC 9602 and the IANA IPv6 Special-Purpose Address Registry mark the block as Source=true, Destination=true, Forwardable=true, and Globally Reachable=false. Updated the introduction, property table, routing section, verification section, and conclusion to describe it as a forwardable special-purpose block for SR domains or collaborating SR domains.
- The post recommended obtaining a sub-prefix from an RIR or deriving a deterministic block from an ASN. RFC 9602 does not define RIR delegation or an ASN-based allocation scheme for `5f00::/16`; it says further conventions and guidelines are needed. Reworded the allocation guidance as an operator/domain plan coordinated inside the intended SR domain.
- The FRR IS-IS example configured `prefix` directly under `router isis ... segment-routing srv6 locator`, but FRR configures SRv6 locator prefixes under zebra's global `segment-routing srv6 locators` hierarchy and has IS-IS reference the configured locator. Updated the snippet accordingly.
- The BGP filtering example called a prefix list as a route map and used the invalid neighbor address `2001:db8::customer`. Updated it to apply the IPv6 prefix list directly under the BGP IPv6 unicast address family with a valid documentation IPv6 address.
- The verification guidance suggested checking reachability from the Internet and tracing to the bare locator base address. Updated it to check reachability from an intended SR-domain vantage point and trace to a programmed SID under the locator.
- The BGP `network` example did not note current FRR import-check behavior. Added a comment that the prefix must exist in the RIB for current FRR defaults.

## Review Notes
- The Python `ipaddress` example is syntactically valid, and the `/48` and `/128` count calculations are correct.
- The Linux `ip -6 route show ...` command and `seg6local action End.X` output shape are consistent with current iproute2 help output on the review host.
