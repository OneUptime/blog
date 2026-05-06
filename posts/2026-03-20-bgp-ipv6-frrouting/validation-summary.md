# Validation Summary: How to Configure BGP IPv6 on Linux with FRRouting

## Status
validated

## Post Type
Guide

## Technologies Covered
- FRRouting
- BGP
- IPv6
- Linux
- `vtysh`

## Sources Consulted
- FRRouting User Guide, BGP: https://docs.frrouting.org/en/stable-10.2/bgp.html
- FRRouting User Guide, BGP: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting User Guide, Basic Setup: https://docs.frrouting.org/en/stable-7.4/setup.html
- FRRouting User Guide, Basic Commands: https://docs.frrouting.org/en/stable-7.4/basic.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/rfc3849/

## Issues Found
- The installation section enabled only `bgpd`, but the post later uses `neighbor ... update-source lo`, which FRR documents as requiring `zebra` when an interface name is used. I updated the install steps to enable `zebra` as well as `bgpd`.
- Several example IPv6 literals were not syntactically valid because they used non-hexadecimal text such as `peer` and `remote`. I replaced them with valid documentation-range IPv6 addresses and prefixes under `2001:db8::/32`.
- The link-local peering example and summary used `%eth0` notation. FRR documents link-local peering by configuring the peer address and separately setting `neighbor <peer> interface <iface>`, so I updated the commands and explanation to match FRR syntax.
- The `next-hop-self` note in the iBGP example implied a broader behavior than FRR documents. I reworded it to reflect the documented behavior for advertising eBGP-learned routes to an iBGP peer unless `force` is used.
- The `network` examples did not mention that the advertised prefix must exist in the local RIB. I added that requirement to the example comments because current FRR behavior requires it.

## Review Notes
- Current FRR documentation also documents interface-based unnumbered peering syntax for point-to-point links. The post’s revised link-local example remains valid for explicitly configured IPv6 link-local peers.
- `systemctl restart frr` remains a valid operational command, although FRR documentation also documents `reload` for applying daemon enablement and configuration changes.
