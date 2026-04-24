# Validation Summary: How to Use the NAS-IPv6-Address RADIUS Attribute

## Status
validated

## Post Type
Guide

## Technologies Covered
- RADIUS
- NAS-IPv6-Address
- IPv6
- RFC 3162
- FreeRADIUS
- Cisco IOS XE
- Juniper Junos
- Wireshark

## Sources Consulted
- RFC 3162, RADIUS and IPv6: https://datatracker.ietf.org/doc/html/rfc3162
- FreeRADIUS `radclient` man page: https://www.freeradius.org/radiusd/man/radclient.html
- FreeRADIUS `radtest` man page: https://www.freeradius.org/radiusd/man/radtest.html
- FreeRADIUS `clients.conf` reference: https://www.freeradius.org/documentation/freeradius-server/4.0.0/reference/raddb/clients.conf.html
- FreeRADIUS MySQL schema (`schema.sql`): https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.2.x/raddb/mods-config/sql/main/mysql/schema.sql
- FreeRADIUS MySQL queries (`queries.conf`): https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.2.x/raddb/mods-config/sql/main/mysql/queries.conf
- FreeRADIUS RADIUS dictionary (`dictionary.rfc3162`): https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/master/share/dictionary/radius/dictionary.rfc3162
- Cisco IOS XE `ip radius source-interface` command reference: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/16-6/command_reference/b_166_9400_cr/b_166_9400_cr_chapter_0111.html
- Cisco IOS XE `radius server` command reference: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/16-9/command_reference/b_169_9400_cr/security_commands.html
- Juniper `source-address` for Access RADIUS: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/access-edit-source-address-radius.html
- Juniper `show network-access aaa radius-servers`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-network-access-aaa-radius-servers.html
- Juniper `show network-access aaa statistics`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-network-access-aaa-statistics.html
- Wireshark RADIUS display filter reference: https://www.wireshark.org/docs/dfref/r/radius.html

## Issues Found
- The post said `NAS-IPv6-Address` was for authentication and accounting. RFC 3162 defines it only for `Access-Request`, so I corrected the description, opening explanation, and conclusion.
- The post said `NAS-IPv6-Address` replaces `NAS-IP-Address` for IPv6 NAS devices. RFC 3162 allows both attributes in the same `Access-Request`, so I changed that wording.
- Multiple example IPv6 literals were invalid, including `2001:db8:nas::1`, `2001:db8::radius`, and the placeholder prefixes in the FreeRADIUS policy examples. I replaced them with valid documentation-prefix IPv6 addresses.
- The Cisco IOS XE example used invalid interface configuration syntax. I changed it to configure `Loopback0` correctly and used the documented `radius server` submode syntax with `address ipv6 ... auth-port ... acct-port ...`.
- The Cisco and Junos notes overstated that the configured source address directly becomes the `NAS-IPv6-Address` attribute. I narrowed those comments to the documented behavior: selecting the source address used for RADIUS packets.
- The Junos verification command `show access radius-server` was not the documented operational command. I replaced it with `show network-access aaa radius-servers`.
- The `radclient` section incorrectly claimed automatic `NAS-IPv6-Address` insertion and misused `-S`. In FreeRADIUS, `-S` means `shared_secret_file`, so I removed that example and used `-6` for IPv6 transport instead.
- The FreeRADIUS unlang examples used invalid IPv6 prefixes and older-style attribute references. I corrected the sample prefixes and changed the policy to use valid `&NAS-IPv6-Address` and `&Framed-IPv6-Prefix` references.
- The FreeRADIUS client verification section implied that `NAS-IPv6-Address` must match the client block and used an unsupported-looking `Auth-Log-Message` example. I corrected the explanation so it matches FreeRADIUS behavior and simplified the example to store the attribute in `Tmp-String-0`.
- The SQL section implied stock accounting schema support for `nasipv6address`, but the upstream FreeRADIUS MySQL schema does not include that column and RFC 3162 does not define the attribute for accounting packets. I rewrote the section as a custom `radpostauth` logging example and adjusted the SQL accordingly.
- The troubleshooting section used the wrong Wireshark field and an imprecise `radtest` example. I corrected the commands to `radius.NAS_IPv6_Address` and `radtest -6`.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- The SQL example now explicitly represents a custom FreeRADIUS extension. Upstream MySQL schema still uses `nasipaddress` for standard accounting tables, so storing `NAS-IPv6-Address` requires schema and query customization.
