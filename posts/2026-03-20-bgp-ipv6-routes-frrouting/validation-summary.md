# Validation Summary: How to Verify BGP IPv6 Routes on FRRouting

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- FRRouting
- BGP
- IPv6
- Linux `iproute2`
- `vtysh`

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local `ip -6 route help` output on the review host
- Local `/etc/iproute2/rt_protos` on the review host (`bgp` protocol alias present)

## Issues Found
- The `State/PfxRcd` explanation implied only numeric values indicate healthy established sessions. Updated it to note FRR can display `(Policy)` for an established eBGP session when default eBGP policy is enabled but filters are missing, per FRR documentation.
- The route-code explanation conflated the leading status code `i` (internal/iBGP) with the trailing origin code `i` (IGP). Updated the bullets to distinguish them.
- The specific-prefix sample incorrectly showed `2001:db8:peer::/48/48`. Corrected it to a single `/48` and adjusted the sample `Last update` line to FRR's documented output style.
- The per-neighbor commands used `neighbors` and described `routes` as all received routes. Updated them to the documented `neighbor` syntax and clarified that `routes` shows prefixes accepted after inbound policy, while `received-routes` shows pre-policy routes and requires `soft-reconfiguration inbound`.
- The kernel-routing example showed an iBGP route installed via `dev lo`, which is not a representative forwarding example for a remote BGP next hop. Replaced it with a routed interface example.
- The `show bgp ipv6 unicast rib-failure` command is not documented in the current FRR BGP command reference, and `grep "^r"` would not reliably match typical FRR route lines because status codes are not at column 1. Replaced that section with the supported guidance to inspect `show bgp ipv6 unicast` and look for the `r` status code.

## Review Notes
- Validated against the latest FRR documentation available on 2026-05-06. Older FRR releases may accept additional legacy CLI aliases, but the post now reflects current documented syntax.
