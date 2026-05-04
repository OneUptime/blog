# Validation Summary: How to Configure Route Summarization

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- IPv4 routing and CIDR
- OSPF (FRR/Quagga) — area range summarization
- BGP (FRR/Quagga) — aggregate-address
- Linux `ip route` (blackhole routes)
- vtysh CLI (FRRouting)

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting OSPF documentation: https://docs.frrouting.org/en/latest/ospfd.html
- FRR GitHub issue tracker (confirmed `show ip bgp neighbors ... received-routes` syntax): https://github.com/FRRouting/frr/issues/10673
- iproute2 / `ip-route(8)` man page (blackhole route type)
- RFC 1338 / RFC 1519 (CIDR / supernetting concepts)
- RFC 2328 (OSPFv2 — Type 3 Summary LSAs originated by ABRs)

## Issues Found
- **Incorrect FRR show command syntax.** The post used `show ip bgp neighbor 10.0.0.2 received-routes` (singular "neighbor"). The correct FRR/vtysh syntax uses the plural form: `show ip bgp neighbors 10.0.0.2 received-routes`. The singular `neighbor` keyword is used for configuration under `router bgp`, but the show command requires `neighbors`. Fixed in the Verifying Summarization section.

## Review Notes
- The summarization math (10.1.0.0/24 .. 10.1.3.0/24 → 10.1.0.0/22) and binary representations are correct; 10.1.0.0/22 covers 10.1.0.0–10.1.3.255.
- OSPF `area 1 range 10.1.0.0/22` and the `not-advertise` modifier are correct FRR/Quagga syntax for summarizing Type 3 inter-area routes at an ABR.
- BGP `aggregate-address 10.1.0.0/22` and `aggregate-address 10.1.0.0/22 summary-only` under `address-family ipv4 unicast` match FRR documented syntax. Worth noting (but not an error): FRR only generates the aggregate when at least one more-specific contributing route exists in the BGP table.
- `ip route add blackhole 10.1.0.0/22` is valid iproute2 syntax and is correct guidance to prevent loops with summarization.
- For `show ip bgp neighbors X received-routes` to display anything, the peer typically requires `neighbor X soft-reconfiguration inbound` — a useful caveat to add in a future revision but not a technical error in the post itself.
