# Validation Summary: How to Enable IPv6 on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (2.5+) firewall/router platform
- IPv6 networking (SLAAC, DHCPv6, DHCPv6-PD, Static IPv6)
- ICMPv6
- Router Advertisement (RA)
- FreeBSD CLI tools (ifconfig, netstat)

## Sources Consulted
- pfSense Documentation – IPv6 Configuration: https://docs.netgate.com/pfsense/en/latest/network/ipv6.html
- pfSense Documentation – WAN IPv6 Configuration Types: https://docs.netgate.com/pfsense/en/latest/interfaces/configure.html
- pfSense Documentation – DHCPv6 Server and RA: https://docs.netgate.com/pfsense/en/latest/services/dhcp/ipv6.html
- pfSense Documentation – Firewall Rules / IPv6: https://docs.netgate.com/pfsense/en/latest/firewall/index.html
- RFC 3849 – IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 4443 – ICMPv6 specification
- RFC 4861 – Neighbor Discovery for IPv6
- FreeBSD man pages: ifconfig(8), netstat(1)

## Issues Found
1. **Invalid IPv6 addresses using non-hexadecimal placeholders**: The post used `2001:db8:wan::2/64`, `2001:db8:wan::1`, `2001:db8:lan::100`, and `2001:db8:lan::200` as example addresses. The strings "wan" and "lan" contain characters ('w', 'n', 'l') that are not valid hexadecimal digits (only 0-9 and a-f are valid in IPv6 addresses), so these are not parseable IPv6 addresses. Replaced them with valid documentation-prefix examples:
   - `2001:db8:wan::2/64` → `2001:db8:1::2/64`
   - `2001:db8:wan::1` → `2001:db8:1::1`
   - `2001:db8:lan::100` → `2001:db8:2::100`
   - `2001:db8:lan::200` → `2001:db8:2::200`
   
   These remain within the RFC 3849 documentation prefix (2001:db8::/32) and are syntactically valid.

## Review Notes
- The menu path `Services → DHCPv6 Server & RA` is correct for pfSense CE 2.5/2.6/2.7. Future versions may rename this — readers on much newer releases should verify the current menu name.
- The post correctly emphasizes that ICMPv6 must not be globally blocked, which is essential per RFC 4890.
- The interface name `em0` in the `ifconfig` example is a common Intel NIC name on FreeBSD/pfSense, but readers should substitute the actual interface name on their system (e.g., `igb0`, `ix0`, `vmx0`).
- The post does not explicitly enable the Router Advertisement (RA) daemon, which is typically required alongside DHCPv6 for SLAAC clients to obtain default routes. This is a content scope choice rather than an error.
- DHCPv6 prefix delegation sizes /48 and /56 are correct as common ISP delegations per RFC 6177 guidance.
- Google Public DNS IPv6 server `2001:4860:4860::8888` is verified correct.
