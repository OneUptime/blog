# Validation Summary: How to Understand Classful vs Classless IPv4 Addressing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 addressing
- Classful addressing
- CIDR
- Subnetting and route aggregation
- RIPv1 and RIPv2
- OSPF
- BGP
- EIGRP
- Python 3
- Linux `ip route`

## Sources Consulted
- RFC 1519, *Classless Inter-Domain Routing (CIDR): an Address Assignment and Aggregation Strategy*: https://www.rfc-editor.org/rfc/rfc1519
- RFC 4632, *Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan*: https://www.rfc-editor.org/rfc/rfc4632
- RFC 1058, *Routing Information Protocol*: https://www.rfc-editor.org/rfc/rfc1058
- RFC 2453, *RIP Version 2*: https://www.rfc-editor.org/rfc/rfc2453
- RFC 2328, *OSPF Version 2*: https://www.rfc-editor.org/rfc/rfc2328
- RFC 4271, *A Border Gateway Protocol 4 (BGP-4)*: https://www.rfc-editor.org/rfc/rfc4271
- RFC 7868, *Cisco's Enhanced Interior Gateway Routing Protocol (EIGRP)*: https://www.rfc-editor.org/rfc/rfc7868
- Python standard library `math` documentation: https://docs.python.org/3/library/math.html
- Local `ip route help` output from `iproute2`

## Issues Found
- The CIDR section cited RFC 4632 as though it were the original 1993 CIDR RFC. I changed the heading to cite RFC 1519 as the original CIDR specification and noted RFC 4632 as the later update.
- The CIDR example said `172.16.0.0/22` provided "exactly 1022 hosts, no waste". That was incorrect for the 500-host scenario and incorrect in general because `/22` leaves significant unused capacity. I changed it to `172.16.0.0/23` with `510 usable hosts, far less waste`.
- The key takeaway claimed CIDR "allocates exactly what's needed". That overstates CIDR efficiency because allocations still follow power-of-two prefix sizes. I changed it to say CIDR allocates much closer to what is needed.
- The key takeaway said CIDR allows prefix lengths `1–32`. In CIDR routing, `/0` is also valid. I changed the range to `/0 to /32`.
- The routing-protocol wording implied that all classless protocols carry prefix information in the same way. I changed it to "prefix length or mask information" because BGP and EIGRP encode prefix length, while OSPF and RIPv2 include mask information.

## Review Notes
- The Python snippet executed successfully and produced the stated output for `compare_efficiency(500)`.
- The `ip route add 10.1.2.0/24 via 192.168.1.1` command matches the local `ip route` syntax.
- The host-count math in the example uses the conventional IPv4 usable-host model that subtracts network and broadcast addresses; the post does not discuss special `/31` and `/32` cases, but that does not affect the example as written.
