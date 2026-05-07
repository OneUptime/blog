# Validation Summary: How to Configure 802.1X Authentication with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IEEE 802.1X
- IPv6
- RADIUS
- FreeRADIUS
- Cisco IOS XE
- Aruba AOS-CX
- `wpa_supplicant`
- SLAAC
- DHCPv6

## Sources Consulted
- RFC 3162, RADIUS and IPv6: https://www.rfc-editor.org/rfc/rfc3162
- RFC 6911, RADIUS Attributes for IPv6 Access Networks: https://www.rfc-editor.org/rfc/rfc6911
- FreeRADIUS 3.2.8 documentation, `radiusd -X` / listen section examples: https://www.freeradius.org/documentation/freeradius-server/3.2.8/radiusd_x.html
- FreeRADIUS official v3 SQL schema: https://github.com/FreeRADIUS/freeradius-server/blob/v3.0.x/raddb/mods-config/sql/main/mysql/schema.sql
- FreeRADIUS official SQL query templates: https://github.com/FreeRADIUS/freeradius-server/blob/master/raddb/mods-config/sql/main/mysql/queries.conf
- Cisco IOS XE RADIUS Configuration Guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/radius/radius-configuration-guide/radius.html
- Cisco 802.1X command examples: https://www.cisco.com/c/en/us/td/docs/Sanity/kissk/xe-310-cg/dot1x.html
- Aruba AOS-CX `radius-server host` command reference: https://arubanetworking.hpe.com/techdocs/AOS-CX/AOSCX-CLI-Bank/cli_10000/Content/Rem_AAA_cmds/rad-ser-hos-10.htm
- Aruba AOS-CX `aaa authentication port-access dot1x authenticator` command reference: https://arubanetworking.hpe.com/techdocs/AOS-CX/AOSCX-CLI-Bank/cli_832x/Content/Chp_Port_acc/Port_acc_802-1X_cmds/aaa-aut-por-acc-dot-aut-fl-10.htm
- Aruba AOS-CX `aaa authentication port-access dot1x authenticator radius server-group` command reference: https://arubanetworking.hpe.com/techdocs/AOS-CX/AOSCX-CLI-Bank/cli_8360/Content/Chp_Port_acc/Port_acc_802-1X_cmds/aaa-aut-por-acc-dot-aut-rad-ser-gro-fl.htm
- `wpa_supplicant` upstream project page: https://w1.fi/wpa_supplicant/
- `wpa_supplicant` configuration/manpage example for wired 802.1X: https://manpages.debian.org/buster/wpasupplicant/wpa_supplicant.conf.5.en.html

## Issues Found
- Invalid IPv6 placeholders were used in multiple places, including `2001:db8::radius`, `2001:db8:vlan100::user/128`, and pool examples using non-hex labels like `corp` and `guest`. I replaced them with valid documentation prefixes under `2001:db8::/32`.
- The FreeRADIUS listener example claimed `ipaddr = ::` was dual-stack and only showed an authentication listener. I corrected it to explicit IPv6 `listen` stanzas using `ipv6addr = ::` for both authentication and accounting, which matches the documented configuration model.
- The Cisco IOS XE RADIUS server example used outdated or incorrect command structure for the server address and ports, omitted the documented `ipv6 unicast-routing` prerequisite, and mixed IPv4 and IPv6 source-interface commands. I updated it to the documented IPv6 form and changed verification to `show aaa servers`.
- The Aruba CX example used incorrect CLI syntax, including `key plain`, `auth-port` on a separate host command, `aaa group radius`, `host ...` under that group, and `dot1x role authenticator`. I replaced those lines with documented AOS-CX `radius-server host`, `aaa group server radius`, `server`, and `aaa authentication port-access ...` commands.
- The Linux client example used `radvd-conf-check` after authentication. That command validates router advertisement daemon configuration on a router/server, not a supplicant host. I replaced it with `ip -6 addr show dev eth0` to verify SLAAC-derived addressing and left DHCPv6 as the alternative path.
- The dynamic IPv6 section used `Framed-IPv6-Pool` together with a Redis-backed `ippool` example that did not match the documented IPv6 RADIUS attribute semantics for this use case and included invalid IPv6 literals. I replaced it with a technically accurate VLAN-to-prefix assignment using `Framed-IPv6-Prefix` and a note that each assigned VLAN should advertise its own IPv6 prefix.
- The monitoring SQL queried `nasipv6address`, which is not present in the official FreeRADIUS v3 default `radacct` schema, and used `IS NOT NULL` logic that would not work with the schema defaults. I changed it to query `framedipv6address` and `framedipv6prefix`, filtering on non-empty values.

## Review Notes
- The post is now technically sound as a general guide, but support for RADIUS IPv6 reply attributes such as `Framed-IPv6-Prefix` and `Framed-IPv6-Address` remains NAS-dependent. In most wired and Wi-Fi 802.1X deployments, the practical IPv6 outcome still comes from the router advertisements or DHCPv6 service on the RADIUS-assigned VLAN.
- Cisco `show dot1x` command variants can differ slightly by platform and software train; `show authentication sessions` and `show aaa servers` are the safest broadly applicable verification commands for current IOS XE documentation.
