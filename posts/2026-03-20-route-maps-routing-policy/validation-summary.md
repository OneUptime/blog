# Validation Summary: How to Configure Route Maps for Routing Policy

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- FRRouting route maps
- BGP routing policy
- OSPF redistribution
- Prefix lists, AS-path lists, and BGP community lists
- vtysh verification commands
- Policy-based routing caveats

## Sources Consulted
- FRRouting Route Maps documentation: https://docs.frrouting.org/en/latest/routemap.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting OSPFv2 documentation: https://docs.frrouting.org/en/latest/ospfd.html
- FRRouting PBR documentation: https://docs.frrouting.org/en/latest/pbr.html
- FRRouting Filtering documentation: https://docs.frrouting.org/en/latest/filter.html
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- Corrected the route-map behavior description so deny clauses are not described as applying set actions.
- Changed the generic route-map syntax from `[permit|deny]` to `(permit|deny)` to match FRRouting's required route-map action syntax.
- Qualified the policy-based routing statement because FRR uses `pbr-map` for PBR, while route-map-based PBR is platform-specific.
- Replaced `ip as-path access-list` with FRR's `bgp as-path access-list` syntax.
- Added a BGP community-list and updated `match community` to reference the list instead of matching a literal community directly.
- Replaced the policy-routing `match interface` example with `match peer eth0`, which is a supported FRR BGP route-map match.
- Reworded the next-hop example as BGP policy because FRR `set ip next-hop` sets the BGP next-hop attribute, not FRR PBR forwarding.
- Moved OSPF external metric type configuration from an unsupported route-map `set metric-type type-1` line to the supported `redistribute static metric-type 1 route-map ...` syntax.
- Replaced `203.0.114.0/24` with `198.51.100.0/24`, an RFC 5737 documentation prefix.
- Clarified that the explicit empty deny sequence is an explicit catch-all, not the implicit deny.
- Added a `remote-as` and address-family context to the BGP neighbor route-map example.
- Added `exit-address-family` to the redistribution snippet so the top-level route-map definition is not shown inside address-family mode.
- Changed the BGP verification commands to use `show ip bgp neighbors ...`, matching FRR's documented command form for advertised and received routes.

## Review Notes
The corrected examples are aligned with current FRRouting documentation. Some route-map concepts remain vendor-dependent, especially policy-based routing behavior, so future expansion should name the target platform explicitly if Cisco IOS, FRR, Arista EOS, or another implementation is intended.
