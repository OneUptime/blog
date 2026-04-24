# Validation Summary: How to Use the RADIUS Delegated-IPv6-Prefix Attribute

## Status
validated

## Post Type
Guide

## Technologies Covered
- RADIUS
- Delegated-IPv6-Prefix
- Framed-IPv6-Prefix
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- FreeRADIUS
- Cisco IOS XE DHCPv6 prefix delegation
- Juniper MX / Junos subscriber management
- ISC Kea DHCPv6
- RFC 3162
- RFC 4818
- RFC 6911

## Sources Consulted
- RFC 4818: RADIUS Delegated-IPv6-Prefix Attribute — https://www.rfc-editor.org/rfc/rfc4818
- RFC 3162: RADIUS and IPv6 — https://www.rfc-editor.org/rfc/rfc3162
- RFC 6911: RADIUS Attributes for IPv6 Access Networks — https://www.rfc-editor.org/rfc/rfc6911
- Cisco IOS IPv6 Command Reference, `prefix-delegation aaa` — https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_10.html
- Cisco DHCPv6 Prefix Delegation Using AAA — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/15-mt/dhcp-15-mt-book/ip6-dhcp-pre-aaa.html
- Juniper Subscriber LAN Addressing with DHCPv6 Prefix Delegation — https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcpv6-prefix-delegation-lan-addressing.html
- Juniper `show dhcpv6 server binding` command reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-dhcpv6-server-binding-command.html
- ISC Kea Administrator Reference Manual, RADIUS integration — https://kea.readthedocs.io/en/kea-3.1.0/arm/integrations.html
- FreeRADIUS `radclient` man page — https://freeradius.org/radiusd/man/radclient.html
- FreeRADIUS 3.0.x `sqlippool` module config — https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.0.x/raddb/mods-available/sqlippool
- FreeRADIUS 3.0.x MySQL SQL schema — https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.0.x/raddb/mods-config/sql/main/mysql/schema.sql
- FreeRADIUS 3.0.x MySQL accounting queries — https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.0.x/raddb/mods-config/sql/main/mysql/queries.conf
- FreeRADIUS 3.0.x SQL IP pool queries — https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.0.x/raddb/mods-config/sql/ippool/mysql/queries.conf
- FreeRADIUS 3.0.x PostgreSQL IP pool schema — https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.0.x/raddb/mods-config/sql/ippool/postgresql/schema.sql

## Issues Found
- Multiple IPv6 examples were invalid because they used non-hexadecimal labels such as `wan`, `home`, `user`, `radius`, and `bng`. Replaced them with valid documentation prefixes under `2001:db8::/32`.
- The RFC 4818 wire-format example had incorrect length math and byte counts. Corrected the `/56` example to an 11-byte attribute with 7 prefix bytes, matching RFC 4818.
- The FreeRADIUS files example used a nonstandard 3.x path (`/etc/freeradius/3.0/users`). Updated it to the documented 3.x `mods-config/files/authorize` location.
- The `Framed-IPv6-Route` example omitted the metric field even though RFC 3162’s recommended text format includes destination, gateway, and metric(s). Updated the example to `... :: 1`.
- The Cisco example used an underspecified `prefix-delegation aaa` line. Updated it to `prefix-delegation aaa method-list default`, matching Cisco’s documented command form.
- The Juniper MX example used CLI structure that did not match Juniper’s documented address-assignment pool syntax and incorrectly described RADIUS CoA as the relevant mechanism. Replaced it with documented delegated-pool syntax and corrected the explanation to Access-Accept behavior using `Delegated-IPv6-Prefix` or `Jnpr-IPv6-Delegated-Pool-Name`.
- The Kea hook example did not match ISC’s documented RADIUS hook configuration. Reworked it to use the documented `access.servers` structure, added the required `libdhcp_host_cache.so` companion hook for access service operation, and fixed the `pd-pools` prefix format.
- The FreeRADIUS “dynamic prefix pool” example used an undocumented `ippool ... backend = redis` configuration. Replaced it with a supported `sqlippool` example using `attribute_name = Delegated-IPv6-Prefix`.
- The accounting section incorrectly instructed readers to add `delegatedipv6prefix` to `radacct`. The stock FreeRADIUS 3.0 MySQL schema already includes that column, so the section was corrected to use the existing schema.
- The conclusion overstated vendor behavior by saying Juniper “uses RADIUS CoA for dynamic updates” and that `Framed-IPv6-Route` should “always” be included. Updated the wording to reflect documented, platform-specific behavior.

## Review Notes
- RFC 6911 introduces `Framed-IPv6-Address` for DHCPv6 host address assignment; this can be a better fit than `Framed-IPv6-Prefix` when the topic is specifically DHCPv6 IA_NA. The post remains focused on delegated prefixes, so this was left as a note rather than expanding the scope.
- The `sqlippool` example is shown with PostgreSQL because the stock FreeRADIUS 3.0 PostgreSQL IP pool schema can store prefix-capable values cleanly. The stock MySQL `radippool` schema is still named around `framedipaddress` and is not a good drop-in example for IPv6 prefix storage without schema work.
- Cisco’s AAA-based DHCPv6-PD flow still depends on AAA and PPP context outside the minimal snippet; the post’s Cisco section is accurate as a focused example, not a complete service-provider edge configuration.
