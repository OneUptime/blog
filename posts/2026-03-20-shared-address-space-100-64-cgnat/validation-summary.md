# Validation Summary: How to Understand the Shared Address Space (100.64.0.0/10)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv4 addressing
- Shared Address Space (100.64.0.0/10)
- Carrier-Grade NAT (CGNAT)
- RFC 6598
- RFC 1918 private addressing
- Linux `ip route`
- Linux `traceroute`
- GNU `head`
- Python `ipaddress`

## Sources Consulted
- RFC 6598: IANA-Reserved IPv4 Prefix for Shared Address Space - https://datatracker.ietf.org/doc/rfc6598/
- IANA IPv4 Special-Purpose Address Space registry - https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- RFC 6269: Issues with IP Address Sharing - https://www.rfc-editor.org/rfc/rfc6269.html
- Python `ipaddress` standard library documentation - https://docs.python.org/3/library/ipaddress.html
- Linux `ip-route(8)` manual page - https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `traceroute(8)` manual page - https://man7.org/linux/man-pages/man8/traceroute.8.html
- GNU Coreutils `head` manual - https://www.gnu.org/software/coreutils/manual/html_node/head-invocation.html

## Issues Found
- The post described 100.64.0.0/10 as "exclusively" for ISP CGNAT use. RFC 6598 defines it as Shared Address Space for service-provider use, primarily to facilitate CGN deployment, with limited additional use on routing equipment that can translate across overlapping interfaces. Updated the wording to "service-provider shared address space, primarily for CGNAT use."
- The post said ISPs assign the range to CPE routers "on the ISP side of the CGNAT device." Updated this to describe the links between subscriber CPE WAN interfaces and ISP CGNAT infrastructure, which matches RFC 6598's CGN-to-CPE interface scope.
- The detection section implied that a 100.64.0.0/10 gateway always proves CGNAT, and that traceroute should show a 100.64.x hop before the public IP. Updated this to say a router WAN-side 100.64.0.0/10 address or gateway usually indicates CGNAT, and that traceroute may show a 100.64.x hop near the start of the path.
- The command used `head -5`, which GNU Coreutils documents as obsolete compatibility syntax. Updated it to `head -n 5`.
- The application-impact section and final takeaway used absolute phrasing for P2P/gaming, port forwarding, customer counts, and IPv6 eliminating CGNAT entirely. Updated these claims to reflect that NAT traversal can be broken or limited, customer-controlled port forwarding requires ISP support, public IPs can be shared by many customers, and IPv6 reduces CGNAT reliance or eliminates it for IPv6-capable traffic.

## Review Notes
The Python `ipaddress` example was executed locally and returned the expected results. `ip route show default` was also tested locally. `traceroute` is not installed in the local container, so its usage was verified against the Linux traceroute manual instead.
