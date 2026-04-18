# Validation Summary: How to Understand the 255.255.255.255 Limited Broadcast Address

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- IPv4 broadcast addressing (limited vs. directed)
- DHCP / BOOTP (RFC 2131)
- ISC DHCP server (`dhcpd`, `dhcpd.conf`)
- Wake-on-LAN
- NetBIOS name resolution
- `tcpdump`, `socat` packet utilities

## Sources Consulted
- RFC 919 — Broadcasting Internet Datagrams: https://datatracker.ietf.org/doc/html/rfc919
- RFC 1812 — Requirements for IP Version 4 Routers (§5.3.5.1 Limited Broadcasts): https://datatracker.ietf.org/doc/html/rfc1812
- RFC 2131 — Dynamic Host Configuration Protocol: https://datatracker.ietf.org/doc/html/rfc2131
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcpd` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- Wikipedia — Wake-on-LAN: https://en.wikipedia.org/wiki/Wake-on-LAN

## Issues Found
1. **Invalid `interface` directive in dhcpd.conf** — The post claimed `interface eth1;` could be placed at the top of `/etc/dhcp/dhcpd.conf` to pin the daemon to a specific interface. ISC DHCP has no such directive; per the official manual, interface restriction is done via command-line arguments (`dhcpd eth1`) or via `INTERFACESv4=` in `/etc/default/isc-dhcp-server` on Debian/Ubuntu. Rewrote the surrounding paragraph to describe the correct mechanism.

2. **Wrong netmask in subnet declaration** — `subnet 192.168.1.0 netmask 255.255.255.255 { }` is invalid; the netmask must reflect the actual subnet, so for the example /24 it should be `255.255.255.0` (255.255.255.255 would be a /32 host route). Corrected the netmask.

3. **Confusing placeholder interface name** — The tcpdump example used `eth0_on_other_side` while the comment described `eth1`. Replaced with `eth1` for consistency.

## Review Notes
- All RFC references (919, implicitly 1812, and the DHCP protocol facts) are accurate.
- DHCP DISCOVER addressing (`0.0.0.0:68 → 255.255.255.255:67`) is correct per RFC 2131.
- Wake-on-LAN port 9 claim is correct (port 7 is also commonly used).
- The phrasing "no routing table lookup occurs - the packet is simply dropped on ingress" is a simplification — routers may still pass the packet to their local IP stack; what RFC 1812 forbids is *forwarding*. Left as-is since the broader point (never forwarded) is accurate and the simplification serves the introductory tone.
