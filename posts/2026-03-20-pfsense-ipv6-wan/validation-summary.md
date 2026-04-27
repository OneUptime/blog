# Validation Summary: How to Configure IPv6 WAN Interface on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (firewall/router OS, FreeBSD-based)
- IPv6 networking
- SLAAC (Stateless Address Autoconfiguration, RFC 4862)
- DHCPv6 (RFC 8415) and DHCPv6 Prefix Delegation (RFC 8415 / RFC 3633)
- ICMPv6 (RFC 4443)
- Router Advertisements (RA)
- FreeBSD networking utilities (ifconfig, netstat)

## Sources Consulted
- pfSense official documentation — IPv6 configuration: https://docs.netgate.com/pfsense/en/latest/interfaces/configure.html
- pfSense Track Interface / Prefix Delegation docs: https://docs.netgate.com/pfsense/en/latest/interfaces/track-interface.html
- pfSense DHCPv6 Server documentation: https://docs.netgate.com/pfsense/en/latest/services/dhcp/index.html
- pfSense IPv6 Firewall Rules guidance: https://docs.netgate.com/pfsense/en/latest/firewall/configure.html
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 4291 — IP Version 6 Addressing Architecture (valid hex digits 0-9, a-f)
- RFC 4443 — ICMPv6 (importance of not blocking ICMPv6)
- RFC 8415 — DHCPv6
- FreeBSD ifconfig(8) and netstat(1) man pages

## Issues Found
- **Invalid IPv6 hex digits in example addresses**: The post used `2001:db8:wan::2/64`, `2001:db8:wan::1`, `2001:db8:lan::100`, and `2001:db8:lan::200` as illustrative examples. While clearly intended as descriptive placeholders, the characters `w`, `n`, and `l` are not valid hexadecimal digits per RFC 4291 (only 0-9 and a-f are allowed in IPv6 address fields). These addresses would be rejected by pfSense's address validators if a reader copied them literally. Replaced with valid hex placeholders within the RFC 3849 documentation prefix: `2001:db8:1::2/64` / `2001:db8:1::1` for WAN, and `2001:db8:2::100` / `2001:db8:2::200` for the LAN DHCPv6 range.

## Review Notes
- The path `Services → DHCPv6 Server & RA` is the historical menu name and matches pfSense CE 2.7.x and earlier as well as pfSense Plus through 23.x. In newer pfSense Plus releases (24.x with Kea DHCP), the menu has been reorganized into separate "DHCPv6 Server" and "Router Advertisements" entries; the post's labeling remains compatible with the broadly deployed CE/Plus versions a reader is likely to be running.
- The pfSense 2.5+ prerequisite is conservative — IPv6 has been supported since pfSense 2.1 — but stating 2.5+ is reasonable since UI and IPv6 handling improvements in 2.5+ make the documented paths and screens accurate.
- Prefix Delegation sizes of /48 or /56 are the realistic options most ISPs hand out; pfSense actually supports a wider range, but the post correctly steers readers to check with their ISP.
- The emphasis on not blocking ICMPv6 is correct and important — Neighbor Discovery, Path MTU Discovery, and SLAAC all depend on ICMPv6, so a blanket block breaks IPv6.
- Google Public DNS over IPv6 (`2001:4860:4860::8888`) is correct.
- FreeBSD CLI examples (`ifconfig em0 | grep inet6`, `netstat -rn -f inet6`) are valid; readers should substitute the actual interface name (e.g., `igb0`, `ix0`) for their hardware.
