# Validation Summary: How to Configure IPv6 for BRAS/BNG Equipment - Equipment

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Broadband Network Gateway (BNG) / BRAS
- PPPoE
- DHCPv6 IA_NA
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- Cisco ASR9K IOS XR
- Juniper MX / Junos OS
- ISC Kea DHCP
- FreeRADIUS
- MySQL

## Sources Consulted
- Cisco ASR 9000 BNG configuration guide, subscriber sessions: https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/26xx/bng/configuration/guide/b-bng-cg-asr9000-26xx/establishing-subscriber-sessions.html
- Cisco ASR 9000 BNG DHCP command reference: https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/bng/command/reference/b-bng-cr-asr9k/b-bng-cr-asr9k_chapter_0101.html
- Juniper: WAN and LAN Addressing Using DHCPv6 IA_NA and DHCPv6 Prefix Delegation: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcpv6-iana-prefix-delegation-addressing.html
- Juniper: Subscriber LAN Addressing with DHCPv6 Prefix Delegation: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcpv6-prefix-delegation-lan-addressing.html
- Juniper `radius-server` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/radius-server-edit-access-subscriber-management.html
- Juniper `show dhcpv6 server statistics` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-dhcpv6-server-statistics-command.html
- Kea DHCPv6 server documentation: https://kea.readthedocs.io/en/kea-2.6.4/arm/dhcp6-srv.html
- RFC 3162, RADIUS and IPv6: https://datatracker.ietf.org/doc/rfc3162/
- RFC 4818, Delegated-IPv6-Prefix Attribute: https://www.rfc-editor.org/rfc/rfc4818.html
- RFC 6911, RADIUS Attributes for IPv6 Access Networks: https://www.rfc-editor.org/rfc/rfc6911.html
- FreeRADIUS users file documentation: https://www.freeradius.org/documentation/freeradius-server/4.0.0/reference/raddb/mods-config/files/users.html
- FreeRADIUS MySQL schema (`radacct`): https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/master/raddb/mods-config/sql/main/mysql/schema.sql

## Issues Found
- Several IPv6 examples used non-hexadecimal hextets such as `wan`, `home`, `bng`, and `radius`, which are not valid IPv6 literals. I replaced them with valid `2001:db8:` documentation addresses.
- The post used `Framed-IPv6-Prefix` for DHCPv6 WAN assignment. RFC 6911 defines `Framed-IPv6-Address` for DHCPv6-assigned WAN addresses and reserves `Framed-IPv6-Prefix`/`Framed-Interface-Id` for SLAAC-oriented addressing. I updated the diagram, RADIUS example, monitoring queries, and conclusion accordingly.
- The Cisco ASR9K section mixed IOS/IOS XE-style commands with IOS XR BNG syntax (`ipv6 dhcp pool`, `Virtual-Template`, `peer ipv6 pool`, `show ipv6 subscribers`). I replaced that block with IOS XR BNG pool and dynamic-template commands plus valid verification commands from Cisco documentation.
- The Juniper MX section contained invalid `set` syntax for RADIUS server configuration and an incomplete PPPoE interface line. I corrected the access profile, `radius-server`, IPv6 address-assignment pool, and delegated-pool syntax to match Junos documentation.
- The Kea example used an invalid DHCPv6 listener value (`"interfaces": ["::"]`) and incorrect PD pool syntax by embedding `/48` inside the `prefix` field while also specifying `prefix-len`. I corrected the interface list, MySQL credential placeholders, subnet/pool examples, and PD pool syntax.
- The monitoring SQL assumed `NULL` in FreeRADIUS MySQL `radacct` IPv6 columns and counted `framedipv6prefix` for DHCPv6 WAN usage. In the stock schema these columns default to empty strings, and stateful WAN DHCPv6 uses `framedipv6address`. I updated the queries to use `framedipv6address <> ''` and `delegatedipv6prefix <> ''`.

## Review Notes
- The vendor configuration blocks are accurate as syntax fragments, but a production BNG deployment still requires the surrounding subscriber service activation, interface attachment, and policy wiring that varies by platform and release.
- The Juniper example uses an IPv6 RADIUS server address; Juniper documents IPv6 `radius-server` support beginning in Junos OS 16.1.
