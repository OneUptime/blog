# Validation Summary: How to Configure IPv6 LAN Interface on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (firewall/router OS, FreeBSD-based)
- IPv6 (RFC 4291, 8200)
- SLAAC (RFC 4862)
- DHCPv6 (RFC 8415)
- DHCPv6 Prefix Delegation (RFC 8415)
- ICMPv6 (RFC 4443)
- Router Advertisements (RFC 4861)
- FreeBSD CLI tools (ifconfig, netstat)

## Sources Consulted
- pfSense Documentation - IPv6 Configuration: https://docs.netgate.com/pfsense/en/latest/interfaces/ipv6-wan.html
- pfSense Documentation - Track Interface: https://docs.netgate.com/pfsense/en/latest/interfaces/ipv6-track.html
- pfSense Documentation - DHCPv6 Server: https://docs.netgate.com/pfsense/en/latest/services/dhcpv6/server.html
- pfSense Documentation - System Advanced Networking: https://docs.netgate.com/pfsense/en/latest/config/advanced-networking.html
- RFC 3849 - IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 4861 - Neighbor Discovery for IPv6
- RFC 4443 - ICMPv6
- RFC 8415 - Dynamic Host Configuration Protocol for IPv6 (DHCPv6)
- FreeBSD man pages: ifconfig(8), netstat(1)

## Issues Found
- **Invalid IPv6 hex characters in example addresses**: The post used `2001:db8:wan::2/64`, `2001:db8:wan::1`, `2001:db8:lan::100`, and `2001:db8:lan::200` as example IPv6 addresses. The characters `w` and `n` are not valid hexadecimal digits (IPv6 only allows 0-9 and a-f), so these strings would not parse as valid IPv6 addresses and would be rejected by pfSense. Replaced the WAN examples with `2001:db8:1::2/64` and `2001:db8:1::1`, and the LAN range with `2001:db8:2::100` and `2001:db8:2::200`. The `2001:db8::/32` documentation prefix from RFC 3849 is preserved.

## Review Notes
- The `Allow IPv6` toggle and `IPv6 over IPv4 Tunneling` option under System → Advanced → Networking are correct. IPv6 has been enabled by default since pfSense 2.3, but the toggle still exists.
- The WAN IPv6 Configuration Types (SLAAC, DHCPv6, Static IPv6) are accurate for current pfSense (CE 2.7.x and Plus 24.x).
- The `Track Interface` mode with `IPv6 Prefix ID: 0` is correctly described as using the first /64 from a delegated prefix.
- DHCPv6 prefix delegation sizes of /48 and /56 are common and correct, though /60 and /64 are also valid in some deployments.
- The `Services → DHCPv6 Server & RA` path is correct for pfSense 2.5+.
- ICMPv6 firewall guidance is correct — RFC 4890 strongly recommends not blocking essential ICMPv6 messages (RS, RA, NS, NA, PTB).
- The FreeBSD CLI commands (`ifconfig em0`, `netstat -rn -f inet6`) are valid for pfSense's FreeBSD base; `em0` is illustrative since interface names depend on hardware.
- Note: pfSense Plus 23.05+ replaced ISC DHCPv6 with Kea DHCPv6 as the default DHCP server. The configuration paths in the post are still correct, but field labels in the GUI may differ slightly when using Kea. This is a minor caveat worth being aware of for future updates.
