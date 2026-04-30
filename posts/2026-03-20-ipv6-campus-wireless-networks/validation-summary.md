# Validation Summary: How to Configure IPv6 for Campus Wireless Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 addressing and subnetting
- DHCPv6 and DHCPv6 Prefix Delegation
- Cisco IOS / IOS XE IPv6 configuration
- RADIUS / eduroam
- FreeRADIUS
- hostapd
- ISC DHCP
- Python 3

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture — https://datatracker.ietf.org/doc/html/rfc4291
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://datatracker.ietf.org/doc/html/rfc8415
- RFC 3162: RADIUS and IPv6 — https://datatracker.ietf.org/doc/html/rfc3162
- RFC 6911: RADIUS Attributes for IPv6 Access Networks — https://datatracker.ietf.org/doc/html/rfc6911
- Cisco IOS XE 17.x: IPv6 Access Services: DHCPv6 Prefix Delegation — https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-dhcp-prefix-xe.html
- eduroam official overview — https://eduroam.org/how/
- FreeRADIUS `sites-available/default` documentation — https://networkradius.com/doc/current/raddb/sites-available/default.html
- FreeRADIUS IP address syntax documentation — https://networkradius.com/doc/current/raddb/syntax/data_ip.html
- FreeRADIUS unlang data types documentation — https://www.freeradius.org/documentation/freeradius-server/3.2.8/unlang/type/index.html
- hostapd official project documentation — https://w1.fi/hostapd/
- hostapd configuration parser source reference — https://w1.fi/hostapd/devel/config_8c_source.html
- ISC DHCP `dhcpd.conf(5)` manual — https://manpages.debian.org/bookworm/isc-dhcp-server/dhcpd.conf.5.en.html
- ISC DHCP `dhcpd.leases(5)` manual — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdleases

## Issues Found
1. Invalid IPv6 example literals appeared throughout the post. Placeholders such as `2001:db8:university::/48`, `::dns`, and `::radius` are not syntactically valid IPv6 addresses. I replaced them with valid documentation-prefix examples under `2001:db8::/32`.
2. The opening description and first paragraph blurred building-level delegation and SSID-level /64s. I corrected the wording so the post now distinguishes per-building delegated prefixes from per-SSID /64 allocations.
3. The Cisco IOS prefix-delegation example mixed two different designs: DHCPv6 Prefix Delegation to downstream routers and host-facing RA/DHCPv6 behavior. It also reused the delegated prefix on the uplink interface, which would overlap the transit link and the delegated block. I fixed the example by using a separate transit /64 on the uplink, keeping the DHCPv6 PD server configuration, and removing the host-facing ND flags from that interface.
4. The FreeRADIUS eduroam example used an invalid IPv6 literal and a nonstandard/incomplete `authorize` stanza (`eduroam_outer`). I changed the listener to a valid `ipv6addr`, replaced the unsupported module reference with standard `suffix` and `eap` processing, added the matching `authenticate` block, and corrected the reply attribute assignment syntax.
5. The hostapd example used an invalid IPv6 RADIUS server literal and omitted the AP’s local RADIUS/NAS IP. I replaced the server address with a valid documentation address and added `own_ip_addr` so the example matches hostapd’s RADIUS client configuration model.
6. The ISC DHCPv6 example used invalid IPv6 literals for subnets and DNS servers. I replaced those with valid documentation addresses while keeping the `subnet6`, `range6`, and DHCP option syntax intact.
7. The Python monitoring script had multiple correctness bugs: it hard-coded only one lease-file path, counted stale historical lease records from ISC DHCP’s log-structured lease database, derived the wrong prefix length by string splitting, and was not robust to compressed IPv6 notation. I rewrote it to try common DHCPv6 lease paths, keep only current active leases, and derive building prefixes with Python’s `ipaddress` module using /56 boundaries that match the article’s addressing plan.

## Review Notes
- The RADIUS attribute numbers in the post are now consistent with RFC 3162 and RFC 6911.
- The DHCPv6 `subnet6` and `range6` examples are syntactically valid for ISC DHCP.
- The post now correctly separates upstream DHCPv6 Prefix Delegation from downstream wireless subnet allocation, but real eduroam and controller behavior still depends on vendor-specific RADIUS attribute support.
