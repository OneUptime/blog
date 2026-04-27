# Validation Summary: How to Configure IPv6 Gateway Monitoring on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (CE 2.5+ / Plus)
- IPv6 networking (SLAAC, DHCPv6, Static IPv6)
- DHCPv6 Prefix Delegation (PD)
- ICMPv6
- FreeBSD CLI tools (`ifconfig`, `netstat`)
- pfSense WebGUI (Interfaces, Firewall Rules, Services, Diagnostics)

## Sources Consulted
- Netgate pfSense Documentation — IPv6 Configuration: https://docs.netgate.com/pfsense/en/latest/interfaces/ipv6.html
- Netgate pfSense Documentation — DHCPv6 Server & RA: https://docs.netgate.com/pfsense/en/latest/services/dhcpv6/server.html
- Netgate pfSense Documentation — System Advanced Networking: https://docs.netgate.com/pfsense/en/latest/config/advanced-networking.html
- Netgate pfSense Documentation — Firewall Rules ICMPv6: https://docs.netgate.com/pfsense/en/latest/firewall/configure.html
- FreeBSD Handbook — Networking: https://docs.freebsd.org/en/books/handbook/network/
- Google Public DNS — IPv6: https://developers.google.com/speed/public-dns/docs/using
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 8504 (IPv6 Node Requirements)

## Issues Found
No technical issues found.

All verified technical claims in the post are accurate:
- The path `System → Advanced → Networking` with the "Allow IPv6" checkbox and "IPv6 over IPv4 Tunneling" option is correct.
- The IPv6 Configuration Type options shown (SLAAC, DHCPv6, Static IPv6, Track Interface) are correct values from the WAN/LAN Interfaces dropdown.
- The DHCPv6 client options "Request only an IPv6 prefix" and "DHCPv6 Prefix Delegation Size" with values 48/56 are accurate.
- The path `Services → DHCPv6 Server & RA → LAN` is the correct location for DHCPv6 server configuration.
- Selecting Protocol: ICMP under a rule with TCP/IP Version: IPv6 correctly applies as ICMPv6 in pfSense's firewall ruleset.
- `2001:4860:4860::8888` is Google Public DNS's official IPv6 resolver.
- `ifconfig em0 | grep inet6` and `netstat -rn -f inet6` are valid FreeBSD/pfSense CLI commands.
- The advice to allow ICMPv6 (not block all of it) aligns with RFC 4890 recommendations — many ICMPv6 message types (NDP, RA/RS, NS/NA, PTB) are required for normal IPv6 operation.

## Review Notes
- **Title vs. content mismatch:** The title promises "Gateway Monitoring" but the body covers general IPv6 enablement, WAN/LAN interface setup, DHCPv6 server, and firewall rules. Native pfSense gateway monitoring (System → Routing → Gateways with Monitor IP, Probe Interval, latency/packet-loss thresholds, alert level, and "Mark Gateway as Down" behavior) is not actually configured in this post. This is a scope issue rather than a factual error in the existing content; per the review guidelines I did not add a new section or restructure the post.
- **Version note:** pfSense CE 2.7.x and pfSense Plus 24.x are the current production releases as of 2026. The "2.5+" prerequisite is technically still accurate but conservative; readers on more recent versions will find the same UI paths.
- **DHCPv6 range example:** The range `2001:db8:lan::100` to `2001:db8:lan::200` is syntactically valid but offers only 257 addresses. In practice IPv6 dynamic ranges are often given much wider scopes (e.g. `::1000` to `::ffff`). Not incorrect — just unusually small for IPv6.
- **`em0` interface name:** The diagnostic example assumes Intel `em` driver. Real interface names vary (`igb0`, `re0`, `ix0`, `vmx0`, etc.) depending on hardware. Readers should substitute the actual interface name.
- **2001:db8::/32** is correctly used as documentation-only address space per RFC 3849.
