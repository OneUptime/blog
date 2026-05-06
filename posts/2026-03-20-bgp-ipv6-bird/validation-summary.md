# Validation Summary: How to Configure BGP IPv6 on Linux with BIRD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- BIRD 2
- BGP
- IPv6
- Linux
- `birdc`
- systemd

## Sources Consulted
- BIRD 2.17.3 User's Guide: https://bird.nic.cz/doc/bird-2.17.3.html
- BIRD current documentation index: https://bird.nic.cz/doc/latest/
- BIRD project site and release listing: https://bird.nic.cz/
- BIRD download page (`2.18.1` listed as the current 2.x release): https://bird.nic.cz/get-bird/
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- Several example IPv6 addresses were not syntactically valid because they used non-hex placeholders such as `peer` and `remote`. I replaced them with valid documentation addresses under `2001:db8::/32` so the examples are parseable while remaining safe for documentation use.
- The iBGP example placed `next hop self` at the BGP protocol level. BIRD 2 documents `next hop self` as an IPv4/IPv6 channel option, so I moved it into the `ipv6 { ... }` block.
- The filtering section called the construct a "prefix list", but BIRD’s filter language uses prefix sets for expressions like `[ 2001:db8:200::/48{48,64} ]`. I corrected the terminology.
- The overview claimed BIRD supports "route maps". BIRD uses its own filter language rather than Cisco-style route maps, so I changed that wording to describe communities and filtering without overstating feature parity.
- The verification example used an invalid sample prefix in `show route for 2001:db8:remote::/48`. I replaced it with a valid IPv6 documentation prefix and clarified that `show route protocol EBGP_PEER` shows accepted imported routes from that peer.

## Review Notes
- As of May 6, 2026, the BIRD project site lists `2.18.1` as the current 2.x release. The corrected configuration syntax remains consistent with the BIRD 2 user guide.
- `bird` and `birdc` are not installed in this workspace, so command syntax was validated against upstream documentation rather than by running the binaries locally.
- The `systemctl enable --now bird` example is common on systemd-based Linux distributions, but exact service names can vary by distribution packaging.
