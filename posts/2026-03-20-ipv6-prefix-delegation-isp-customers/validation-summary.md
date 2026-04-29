# Validation Summary: How to Configure IPv6 Prefix Delegation for ISP Customers

## Status
validated

## Post Type
Configuration Guide / Tutorial

## Technologies Covered
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- ISC Kea DHCPv6 server
- ISC DHCP (`dhcpd`)
- ISC DHCP client (`dhclient`)
- OpenWrt
- FreeRADIUS
- RADIUS
- Router Advertisement (RA)

## Sources Consulted
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://datatracker.ietf.org/doc/html/rfc8415
- RFC 3633: IPv6 Prefix Options for Dynamic Host Configuration Protocol (DHCP) version 6 — https://datatracker.ietf.org/doc/html/rfc3633
- RFC 6603: Prefix Exclude Option for DHCPv6-based Prefix Delegation — https://datatracker.ietf.org/doc/html/rfc6603
- RFC 3162: RADIUS and IPv6 — https://datatracker.ietf.org/doc/html/rfc3162
- RFC 4818: RADIUS Delegated-IPv6-Prefix Attribute — https://datatracker.ietf.org/doc/html/rfc4818
- ISC Kea Administrator Reference Manual, DHCPv6 server / PD pools — https://kea.readthedocs.io/en/kea-2.7.6/arm/dhcp6-srv.html
- ISC DHCP 4.4 manual page: `dhcpd.conf` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 manual page: `dhclient` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- OpenWrt official IPv6 configuration guide — https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt official network configuration reference — https://openwrt.org/docs/guide-user/network/network_configuration
- FreeRADIUS official users-file documentation — https://www.freeradius.org/documentation/freeradius-server/4.0.0/reference/raddb/mods-config/files/users.html

## Issues Found
1. Several example IPv6 literals were invalid because they used non-hexadecimal groups such as `cust1` and `dns`. I replaced them with valid documentation-prefix addresses.
2. The Kea `excluded-prefix` example was invalid. RFC 6603 requires the excluded prefix length to be longer than the delegated prefix length, so excluding a `/48` from a delegated `/56` cannot work. I removed the invalid `excluded-prefix` lines and kept the PD pool example correct.
3. The Linux `dhclient6.conf` example used an undocumented `send dhcp6.ia-pd` configuration pattern. ISC documents prefix delegation through `dhclient -6 -P`, so I replaced the snippet with the supported command-line invocation and a `/56` prefix-length hint.
4. The OpenWrt example used `option ifname` inside an interface section, which is deprecated in current OpenWrt interface configuration. I updated it to `option device`.
5. The verification section depended on `journalctl -u dhclient6`, which is not a portable or documented service name. I replaced it with route and interface checks that match the delegated-prefix outcome the post is describing.
6. The RADIUS example mixed `Framed-IPv6-Prefix` with a DHCPv6-PD example and used an invalid prefix literal. I simplified it to `Delegated-IPv6-Prefix`, which RFC 4818 defines for delegated prefixes.
7. The `dhcpd` `prefix6` example only covered a small subset of the `/40` shown in the surrounding text. I expanded the upper bound to the last `/56` inside that `/40` so the example matches the described pool size.

## Review Notes
- ISC DHCP (`dhcpd` and `dhclient`) is end-of-life per ISC documentation. The legacy `dhcpd` example is still technically valid, but Kea is the actively maintained ISC DHCP server.
- RFC 3633 is the original DHCPv6-PD specification, while RFC 8415 is the current consolidated DHCPv6 standard that incorporates prefix delegation.
- Local checks: `validation.json` was validated with `jq`. Live DHCPv6-PD testing against a real ISP, Kea server, OpenWrt router, or RADIUS-backed BNG was not possible in this workspace.
