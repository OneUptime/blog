# Validation Summary: How to Subnet a Class C Network into Smaller Subnets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv4 subnetting
- CIDR prefix notation
- Python `ipaddress` module
- Linux `ip route` static routes
- Route summarization

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 791, Internet Protocol: https://datatracker.ietf.org/doc/html/rfc791
- RFC 950, Internet Standard Subnetting Procedure: https://datatracker.ietf.org/doc/html/rfc950
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://datatracker.ietf.org/doc/html/rfc3021
- RFC 4632, Classless Inter-domain Routing (CIDR): https://datatracker.ietf.org/doc/html/rfc4632
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local command checks: `python3 --version`, Python snippet execution, `ip -Version`, and `ip route help`

## Issues Found
- The `/27` Python example used `ipaddress.IPv4Network(...)` without importing `ipaddress` in that snippet. Added `import ipaddress` so the example runs independently.
- The route example described "advertising" a route, but `ip route add` installs a static route in the kernel routing table. Updated the wording to describe adding a static summary route and used a reachable transit-style next-hop address instead of a next hop inside the summarized prefix.
- The key takeaway said each borrowed bit halves host capacity. Updated it to say each borrowed bit halves the address block size, which is the exact binary subnetting behavior; usable host counts are then reduced by reserved network and broadcast addresses in traditional IPv4 subnets.
- The key takeaway said a `/24` can be divided into "up to" 64 `/30` subnets with 2 usable hosts each. Qualified this as traditional subnetting that reserves network and broadcast addresses, because RFC 3021 permits `/31` point-to-point links as a separate case.
- The summarization takeaway implied any subnets of a `/24` can always be summarized to the parent `/24`. Clarified that summarization is appropriate for contiguous subnets when they share the same routing path.

## Review Notes
The "Class C" framing is historically accurate for `192.168.1.0/24`, but modern routing is classless CIDR and should generally carry explicit prefix lengths. The article now reflects that nuance where it matters for subnetting and summarization.
