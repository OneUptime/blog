# Validation Summary: How to Configure Anycast with IPv4 Using BGP

## Status
validated

## Post Type
Guide

## Technologies Covered
- Anycast
- BGP
- FRRouting (FRR)
- IPv4
- Linux `iproute2`
- DNS
- `systemd` timers

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 4786, *Operation of Anycast Services*: https://www.rfc-editor.org/rfc/rfc4786.html
- RFC 7999, *BLACKHOLE Community*: https://www.rfc-editor.org/rfc/rfc7999.html
- Google Public DNS FAQ: https://developers.google.com/speed/public-dns/faq
- Cloudflare Anycast overview: https://www.cloudflare.com/learning/cdn/glossary/anycast-network/
- Local `crontab(5)` man page
- Local `ip address help` CLI output

## Issues Found
- The post stated that BGP sends clients to the "nearest" or "best-performing" instance. I changed this to topologically preferred routing language because RFC 4786 and provider documentation describe anycast selection in terms of routing topology and policy, not guaranteed geographic or performance-optimal choice.
- The FRRouting example omitted `no bgp ebgp-requires-policy`. In current FRR traditional mode, missing inbound or outbound policy prevents eBGP routes from being accepted or advertised. I added the command and clarified that real deployments should use explicit policy.
- The verification command used legacy `show ip bgp` syntax. I updated it to `show bgp ipv4 unicast 203.0.113.10/32` because FRR documents the `show ip bgp` form as old command structure that should no longer be used.
- The post presented `/32` advertisement as general anycast guidance. I clarified that this is suitable for a lab or controlled network, and that public-Internet IPv4 anycast typically uses a covering `/24` because longer prefixes are commonly filtered.
- The health-check comment said the script could run every 30 seconds via cron. I corrected this to a `systemd` timer because standard cron runs on one-minute granularity.
- The Anycast vs Load Balancer table made absolute claims about geography, session stickiness, and DDoS mitigation. I qualified those statements so they reflect deployment-dependent behavior.

## Review Notes
- The loopback `/32` plus FRR `network` example is reasonable for a simple lab-style demonstration because the post now makes the scope explicit and ties route origination to the prefix existing in the RIB.
- RFC 4786 warns against rapid advertisement and withdrawal oscillations. A production design would usually add hysteresis, dampening, or more careful health-check policy to avoid route flapping.
