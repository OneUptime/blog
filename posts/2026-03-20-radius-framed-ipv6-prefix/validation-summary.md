# Validation Summary: How to Use the RADIUS Framed-IPv6-Prefix Attribute

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- RADIUS
- IPv6
- RFC 3162 Framed-IPv6-Prefix
- RFC 4818 Delegated-IPv6-Prefix
- RFC 6911 Framed-IPv6-Address and Framed-IPv6-Pool
- FreeRADIUS
- Cisco IOS / IOS XE BNG
- Junos subscriber management
- PPP / PPPoE
- `radclient`

## Sources Consulted
- RFC 3162: https://datatracker.ietf.org/doc/html/rfc3162
- RFC 4818: https://datatracker.ietf.org/doc/html/rfc4818
- RFC 6911: https://datatracker.ietf.org/doc/html/rfc6911
- FreeRADIUS `radclient` man page: https://www.freeradius.org/radiusd/man/radclient.html
- Cisco IOS XE IPv6 implementation guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-3s/ipv6-xe-36s-book/ip6-adsl-dial.html
- Cisco Managed IPv6 LNS configuration guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/mp_l2_vpns/configuration/xe-16-9/mp-l2-vpns-xe-16-9-book/configuring_the_managed-ipv6-layer-2-tunnel-protocol-network-server.pdf
- Juniper IPv6 subscriber addressing designs: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/ipv6-addressing-subscriber-access-designs.html
- Juniper dual-stack PPPoE access with NDRA: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dual-stack-pppoe-access-ndra.html
- Juniper DHCPv6 IA_NA and prefix delegation addressing: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcpv6-iana-prefix-delegation-addressing.html
- Juniper `show subscribers` command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-subscribers.html
- Juniper `show network-access aaa radius-servers` command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-network-access-aaa-radius-servers.html
- `pppd(8)` manual page: https://www.man7.org/linux/man-pages/man8/pppd.8.html

## Issues Found
- The overview treated `Framed-IPv6-Prefix` as a general IPv6 address-assignment attribute. I corrected it to match RFC 3162 and RFC 6911: it carries a prefix and corresponding route, while DHCPv6 IA_NA uses `Framed-IPv6-Address` and DHCPv6-PD uses `Delegated-IPv6-Prefix`.
- Several example IPv6 literals were invalid because they used non-hex words such as `user`, `bob`, `users`, `radius`, and `nas`. I replaced them with valid documentation addresses under `2001:db8::/32`.
- The FreeRADIUS examples implied an unsupported `ippool`-style FreeRADIUS IPv6 prefix configuration. I replaced that section with a technically correct `Framed-IPv6-Pool` example and clarified that the actual pool must already exist on the NAS.
- The Cisco example used commands that did not match Cisco's documented handling of `Framed-IPv6-Prefix`. I replaced it with the documented `ipv6 nd prefix framed-ipv6-prefix` virtual-template example and adjusted the verification commands.
- The Juniper example used unrelated `dhcpv6-client` and local pool commands. I replaced it with documented dynamic-profile variables, `$junos-ipv6-address` and `$junos-ipv6-ndra-prefix`, plus supported verification commands.
- The Linux PPP section overstated what `pppd` and specific RADIUS plugins do. I rewrote it to the verifiable behavior from `pppd(8)`: PPP/PPPoE uses IPv6CP for interface identifiers, and the resulting address should be verified on the PPP interface.
- The `radclient` examples used invalid IPv6 literals and omitted the explicit IPv6 mode that FreeRADIUS documents. I corrected the addresses and used `-6` with bracketed IPv6 server syntax.

## Review Notes
- Vendor handling of `Framed-IPv6-Prefix` is access-model specific. Cisco IOS / IOS XE commonly uses it for ND/RA on virtual-access interfaces, while Junos maps it into dynamic-profile variables. The post is now accurate at that level, but exact deployment details should still be checked against the target platform and software release.
