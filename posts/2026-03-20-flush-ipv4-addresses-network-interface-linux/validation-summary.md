# Validation Summary: How to Flush All IPv4 Addresses from a Network Interface on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IPv4 interface addressing
- `iproute2` `ip` command
- Routing tables
- DHCP with `dhclient`

## Sources Consulted
- `ip-address(8)` man page (iproute2): https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip(8)` man page (iproute2): https://man7.org/linux/man-pages/man8/ip.8.html
- `ip-route(8)` man page (iproute2): https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip-neighbour(8)` man page (iproute2): https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- ISC DHCP `dhclient` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP `dhclient-script` manual page: https://kb.isc.org/docs/isc-dhcp-443-manual-pages-dhclient-script

## Issues Found
- The route-cleanup explanation was too broad. `ip-address(8)` documents automatic handling of the address's associated prefix route, but does not document blanket removal of every route that may depend on that address. I changed the post to refer specifically to kernel-generated connected routes and noted that manually added routes, such as a default route, may need separate removal.
- The claim that flushing addresses clears ARP cache entries was removed. `ip-neighbour(8)` documents neighbour/ARP cache management as a separate operation, and `ip-address(8)` does not state that `ip address flush` clears ARP entries.
- The "flush all interfaces" loop was not robust on modern interface naming. Parsing `ip link show` can produce names with `@` suffixes and also iterated interfaces that may not have IPv4 addresses. I changed it to derive interface names from `ip -o -4 addr show`, which better matches the stated goal.
- I made two examples more explicit for correctness and scope: the label-based flush now uses `-4`, and the default-route example now specifies `dev eth0`.

## Review Notes
- The `dhclient` example is technically valid for systems using ISC `dhclient`, but some current Linux distributions use NetworkManager, `systemd-networkd`, or other DHCP clients instead.
- These `ip` commands change the live kernel network state only; persistent network configuration must be updated separately if the address change should survive a reboot or service restart.
