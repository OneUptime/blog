# Validation Summary: How to Separate IPv6 Management Plane from Data Plane

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ULA addressing
- Cisco IOS XE
- Junos OS
- Linux network namespaces
- Linux VRF
- ip6tables
- Control Plane Policing (CoPP)
- NETCONF

## Sources Consulted
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- Cisco IOS IPv6 Command Reference (`ipv6 nd ra suppress`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IOS XE VRF Awareness Access Class Line: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/bbdsl/configuration/xe-16-11/bba-xe-16-11-book/bba-xe-16-8-book_chapter_0100101.html
- Cisco IOS XE IPv6 Access Control Lists: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/sec-vpn/b-security-vpn/m_ip6-acls-xe.html
- Cisco IOS IPv6 Command Reference (`match access-group name`): https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_09.html
- Cisco IOS XE Control Plane Policing: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_plcshp/configuration/xe-3s/asr903/17-1-1/b-qos-plcshp-xe-17-asr900/m_qos-plcshp-ctrl-pln-plc-900.html
- Junos OS management instance (`mgmt_junos`): https://www.juniper.net/documentation/us/en/software/junos/junos-getting-started/topics/topic-map/management-interface-in-non-default-instance.html
- Junos OS management Ethernet interfaces (`fxp0`/`em0`): https://www.juniper.net/documentation/us/en/software/junos/interfaces-ethernet/topics/topic-map/management-ethernet-interfaces.html
- Junos OS `system services ssh`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/ssh-edit-system.html
- Junos OS applying firewall filters to interfaces: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/task/firewall-filter-qfx-series-applying-cli.html
- Linux kernel VRF documentation: https://docs.kernel.org/networking/vrf.html
- `ip-netns(8)` manual page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- IANA Service Name and Transport Protocol Port Number Registry (`netconf-ssh` 830): https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=netconf
- RFC 8040, RESTCONF Protocol: https://www.rfc-editor.org/rfc/rfc8040

## Issues Found
- The post used invalid IPv6 literals such as `fd00:mgmt::/48`. IPv6 hextets must be hexadecimal, so these were replaced with a valid ULA example prefix, `fd12:3456:789a::/48`, throughout the post.
- The ULA explanation was too absolute in two places. RFC 4193 defines ULAs as `fc00::/7` and says they are not expected to be routable on the global Internet, not that they can never appear there. I corrected the wording and updated the summary to use the correct ULA range.
- The Cisco example used `ipv6 nd ra suppress` with a comment that claimed there would be no RAs at all. Cisco documents that this command suppresses only unsolicited RAs unless `all` is specified, so I changed it to `ipv6 nd ra suppress all`.
- The Cisco VTY ACL example placed management access in a VRF but used non-VRF-aware `ipv6 access-class` syntax. I changed it to the VRF-aware form documented by Cisco so the example matches the stated design.
- The Juniper section was labeled as a routing-instance example but did not configure the `mgmt_junos` management instance, and it applied the filter to `lo0` instead of the management interface. I updated it to configure `mgmt_junos` and apply the IPv6 filter to `fxp0`.
- The Linux namespace and VRF examples used `eth0`, which would usually be the main data-plane NIC and would not demonstrate separation cleanly. I changed these to use a dedicated management interface (`eth1`) and brought up `lo` in the namespace.
- The firewall section labeled TCP/830 as "Netconf/RESTCONF". TCP port 830 is the IANA-assigned port for NETCONF over SSH; RESTCONF is HTTP-based. I corrected the example to refer only to NETCONF over SSH.
- The CoPP snippet was not a valid configuration example because it referenced undefined classes and used `class DEFAULT` instead of `class-default`. I replaced it with a syntactically complete IOS-style example using an IPv6 ACL, a class map, and `class-default`.

## Review Notes
- `ip6tables` syntax is still valid, but many modern Linux distributions default to nftables underneath; future revisions could show an `nft` example as well.
- If a Linux deployment uses a separate network namespace for management, firewall rules must be applied in that namespace to affect the management interface.
- Junos `mgmt_junos` behavior and Cisco user-defined CoPP support can vary by platform and release, so readers should confirm feature support on their specific hardware before deploying the examples unchanged.
