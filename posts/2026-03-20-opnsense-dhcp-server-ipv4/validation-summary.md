# Validation Summary: How to Configure DHCP Server for IPv4 on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OPNsense (FreeBSD-based firewall distribution)
- ISC DHCP (dhcpd)
- Kea DHCP (mentioned as the modern alternative)
- DHCP / DHCPv4 protocol
- DHCP options (RFC 2132, RFC 3442)
- DHCP Relay

## Sources Consulted
- OPNsense ISC DHCP manual: https://docs.opnsense.org/manual/isc.html
- OPNsense DHCP overview: https://docs.opnsense.org/manual/dhcp.html
- RFC 3442 — The Classless Static Route Option for DHCPv4: https://datatracker.ietf.org/doc/html/rfc3442
- RFC 2132 — DHCP Options and BOOTP Vendor Extensions
- ISC DHCP server documentation (dhcp-options(5), dhcpd.conf(5))
- OPNsense forum discussions on dhcpd.conf path (chroot under /var/dhcpd)
- Cisco DHCP Option 150 references (multi-server TFTP semantic)

## Issues Found
1. **DHCP Option 121 hex value was invalid (RFC 3442).** The original example `c0a81400810101` is a 7-byte string starting with `c0` (192), which is not a valid prefix length (max 32). Replaced with `18c0a814c0a80101` — a correctly encoded RFC 3442 route for `192.168.20.0/24 via 192.168.1.1` (prefix `0x18`, destination `c0 a8 14`, gateway `c0 a8 01 01`). Added a clarifying comment describing the route.
2. **DHCP Option 150 type changed from `ip` to `ipaddrs`.** Cisco's option 150 is semantically an array of TFTP server IPs (multiple servers supported). OPNsense's "ipaddrs" type matches this; `ip` (single IP) is not the canonical type for this option even though it would work for a single value.
3. **Generated dhcpd.conf path corrected.** OPNsense's ISC dhcpd runs chrooted under `/var/dhcpd`, so the active generated config lives at `/var/dhcpd/etc/dhcpd.conf`, not `/var/etc/dhcpd.conf`. Updated the comment header in the example.
4. **DHCP Relay menu path corrected.** The original `Services > ISC DHCPv4 > Relay` is wrong — DHCP Relay is a separate top-level item in the OPNsense menu at `Services > DHCPv4 Relay` (not nested inside ISC DHCPv4). Updated the navigation breadcrumb accordingly.

## Review Notes
- The post correctly notes that OPNsense uses ISC DHCP "(or Kea in newer versions)". As of OPNsense 25.7, ISC DHCP is end-of-life and dnsmasq is the new default, with Kea as the recommended modern alternative. The post's instructions still apply when ISC DHCPv4 is explicitly enabled, but readers on 25.x+ should be aware that the ISC plugin path is deprecated. This is acknowledged in the introduction; no edit was made because adding a full deprecation banner would exceed the scope of fixing technical errors.
- DHCP option 066 with `text` type is correct (RFC 2132 defines option 66 as a string / TFTP server name).
- The ISC `dhcpd.conf` snippet syntax (subnet declaration, range, options, host static mapping with `hardware ethernet` / `fixed-address`) is syntactically valid ISC DHCP configuration.
- GUI navigation paths for `Services > ISC DHCPv4 > [LAN]`, `[OPT1]`, and `Leases` are correct per current OPNsense documentation.
- Lease times (86400 seconds = 24 hours, 3600 = 1 hour) are valid ISC DHCP lease values.
