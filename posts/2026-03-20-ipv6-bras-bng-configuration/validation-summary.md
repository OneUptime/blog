# Validation Summary: How to Configure IPv6 for BRAS/BNG Equipment

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- BRAS / BNG
- Cisco ASR 1000 / Cisco IOS XE
- Juniper MX / Junos OS
- PPPoE
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- RADIUS

## Sources Consulted
- Cisco Broadband Access Aggregation and DSL Configuration Guide, Cisco IOS XE Release 3S (ASR 1000) - PPP over Ethernet Client: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/bbdsl/configuration/xe-3s/asr1000/bba-xe-3s-asr1000-book/bba-pppoe-client-xe.html
- Cisco Intelligent Services Gateway Configuration Guide, Cisco IOS XE Release 3S (Cisco ASR 1000) - Configuring ISG Access for PPP Sessions: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/isg/configuration/xe-3s/asr1000/isg-xe-3s-asr1000-book/isg-acess-ppp-sess.html
- Cisco IOS IPv6 Command Reference - `show ipv6 route`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_16.html
- Juniper Junos OS - Dual Stack for PPPoE Access Networks Using DHCP: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dual-stack-pppoe-access-dhcp.html
- Juniper Junos OS - Configuring a PPPoE Dynamic Profile: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-vlan/topics/task/subscriber-management-pppoe-dynamic-profile-basic.html
- Juniper Junos OS - DHCPv6 Server and `show dhcpv6 server binding`: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-server.html and https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-dhcpv6-server-binding-command.html
- RFC 3162, RFC 4818, RFC 6911, and the IANA RADIUS Types registry: https://www.rfc-editor.org/rfc/rfc3162.html, https://www.rfc-editor.org/rfc/rfc4818, https://www.rfc-editor.org/rfc/rfc6911.html, https://www.iana.org/assignments/radius-types/radius-types.xhtml

## Issues Found
- The post used invalid IPv6 example literals such as `2001:db8:subs::/40`, `2001:db8:bng::1/64`, and `2001:db8:radius::10`. IPv6 hextets must be hexadecimal, so these examples were replaced with valid documentation-safe `2001:db8:` examples.
- The Cisco ASR 1000 snippet described DHCPv6 prefix delegation but only showed a local IPv6 pool and `peer default ipv6 pool`, which matches basic PPPoE IPv6 addressing rather than a DHCPv6-PD server configuration. The snippet was corrected to use an `ipv6 dhcp pool`, `prefix-delegation pool`, and `ipv6 dhcp server` on the virtual template, matching Cisco’s documented PPPoE IPv6 DHCPv6-PD workflow.
- The Cisco virtual-template example included `ppp ipcp address accept`, which is an IPv4 IPCP setting and not part of IPv6 configuration. It was removed.
- The Juniper MX snippet was incomplete for PPPoE subscriber management and mixed in unsupported or misleading lines. It was corrected to use an IPv6 delegated address-assignment pool, a DHCPv6 local-server group bound to `pp0.0`, and a PPPoE dynamic profile with required `pppoe-options` and IPv6 unnumbered addressing.
- The RADIUS example used `Framed-IPv6-Pool` for a DHCPv6-PD pool selection use case. Per RFC 6911, the more specific attribute for delegated prefix pool selection is `Delegated-IPv6-Prefix-Pool`, so the example and attribute list were corrected.
- The route-injection section incorrectly described a delegated `/56` as a host route and used a nonstandard verification command. It was corrected to describe a delegated-prefix route and to use the standard Cisco `show ipv6 route <prefix>` command, with the route code adjusted to `U` for a per-user static route.
- The monitoring section used `show subscriber session all detail | include IPv6` and `show dhcp v6 server binding detail`. The Cisco command was updated to the documented `show subscriber session detailed | include IPv6`, and the Junos command was corrected to `show dhcpv6 server binding detail`.

## Review Notes
- The corrected examples are representative platform-family examples. Exact subscriber-management workflows can vary by Cisco IOS XE release, Junos release, and the operator’s AAA design.
- RFC 9915 now obsoletes RFC 8415 for DHCPv6, but the post’s core DHCPv6-PD concepts remain current after the configuration fixes.
