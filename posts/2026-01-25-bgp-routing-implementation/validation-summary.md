# Validation Summary: How to Implement BGP Routing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- BGP
- BIRD Internet Routing Daemon
- FRRouting (FRR)
- BFD
- RPKI/ROA validation
- TCP MD5 authentication
- Anycast routing
- Bash scripting

## Sources Consulted
- BIRD 2.16 User's Guide: https://bird.nic.cz/doc/bird-2.16.2.html
- BIRD filter language reference: https://bird.network.cz/doc/bird-5.html
- FRRouting 8.4 BGP documentation: https://docs.frrouting.org/en/stable-8.4/bgp.html
- FRRouting 8.4 route-map documentation: https://docs.frrouting.org/en/stable-8.4/routemap.html
- FRRouting 8.4 BFD documentation: https://docs.frrouting.org/en/stable-8.4/bfd.html
- RFC 4271, Border Gateway Protocol 4: https://www.rfc-editor.org/rfc/rfc4271
- RFC 5880, Bidirectional Forwarding Detection: https://www.rfc-editor.org/rfc/rfc5880
- RFC 6483 and RFC 6811, RPKI route origin validation: https://www.rfc-editor.org/rfc/rfc6483 and https://www.rfc-editor.org/rfc/rfc6811
- RFC 6996, Private Use ASNs: https://www.rfc-editor.org/rfc/rfc6996

## Issues Found
- The BIRD BGP examples used top-level `import` and `export` statements in BGP protocols. In BIRD 2, these policies belong inside an address-family channel such as `ipv4 { ... };`. Updated the BGP, static, kernel, and MD5 examples to use explicit IPv4 channel configuration.
- The BIRD ISP examples configured two `import filter` statements in each BGP protocol, which would not reliably combine the safety filter and local-preference policy. Replaced this with per-ISP import filters that both reject undesirable routes and set the intended local preference.
- The private-AS filter only covered the 16-bit private ASN range. Added the RFC 6996 32-bit private ASN range.
- The anycast health-check example referenced an undefined `health_check_ok` symbol and used `configure soft "static_anycast"` against a non-existent protocol name. Updated the example so the static route starts disabled, the script enables or disables the actual `anycast_routes` protocol, and the export filter accepts only that route.
- The FRR BFD example configured BFD peers but did not attach BFD to the BGP neighbors. Added `neighbor ... bfd` commands under `router bgp`.
- The FRR BFD peer example used `echo-interval`, which is not the documented FRR 8.4 command. Changed it to `echo receive-interval`.

## Review Notes
The examples still use documentation prefixes and private/example ASNs, which is appropriate for a tutorial. The FRR `soft-reconfiguration inbound` command is valid, but in production it has memory tradeoffs and route refresh is usually preferred when supported.
