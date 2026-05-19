# Validation Summary: How to Configure BGP with FRRouting on Ubuntu

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Ubuntu
- FRRouting
- BGP
- eBGP and iBGP
- vtysh
- Linux systemd networking services
- BGP route maps and prefix lists

## Sources Consulted
- FRRouting Debian repository instructions: https://deb.frrouting.org/
- FRRouting installation documentation: https://docs.frrouting.org/en/stable-10.4/installation.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting BFD documentation: https://docs.frrouting.org/en/latest/bfd.html
- FRRouting basic setup / daemons documentation: https://docs.frrouting.org/en/stable-7.4/setup.html
- Ubuntu 24.04 FRR package default `/etc/frr/daemons` file, inspected from the `frr` package available via Ubuntu APT
- RFC 4271, Border Gateway Protocol 4: https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The daemon configuration example showed `zebra=yes` and instructed readers to keep it. On current Ubuntu FRR packaging, `watchfrr`, `zebra`, and `staticd` are always started and `zebra` is not a `zebra=yes` entry in `/etc/frr/daemons`. I removed that misleading line and kept the instruction focused on enabling `bgpd=yes`.
- The service command used `sudo systemctl start frr` after editing `/etc/frr/daemons`. If FRR was already running after package installation, `start` would not restart the service or launch the newly enabled BGP daemon. I changed it to `sudo systemctl restart frr`.
- The route-map section issued `clear ip bgp 192.168.10.2 soft in` while still in configuration mode. I added `end` before the clear command so it is run from enable mode.
- The multi-hop eBGP example configured loopback peering but did not state that the peer loopback must be reachable through the underlay before BGP can establish. I added a brief configuration comment noting that requirement.

## Review Notes
The remaining FRR repository setup, BGP neighbor configuration, IPv4 unicast address-family syntax, prefix-list and route-map syntax, timer configuration, BFD neighbor syntax, and BGP verification commands are consistent with current FRRouting documentation. Future improvements could include showing the OS-level loopback/interface IP setup and optional `bfdd=yes` when enabling BFD, but those are outside the narrow correction scope.
