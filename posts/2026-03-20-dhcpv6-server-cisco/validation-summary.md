# Validation Summary: How to Configure a DHCPv6 Server on Cisco IOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- Cisco IOS-XE
- DHCPv6
- IPv6 Neighbor Discovery and Router Advertisements
- DHCPv6 Prefix Delegation

## Sources Consulted
- Cisco IOS IPv6 Command Reference: `ipv6 dhcp pool`, `prefix-delegation`, and related IPv6 DHCPv6 commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IOS IPv6 Command Reference: `show ipv6 dhcp`, `show ipv6 dhcp binding`, `show ipv6 dhcp conflict`, and `show ipv6 dhcp interface`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html
- Cisco IOS IPv6 Command Reference: `clear ipv6 dhcp binding`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-a1.html
- Cisco IOS DHCPv6 Individual Address Assignment configuration guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/15-sy/dhcp-15-sy-book/DHCPv6-Ind-Addr-Assnt.pdf
- Cisco troubleshooting guide for IPv6 dynamic address assignment and stateful DHCPv6 behavior: https://www.cisco.com/c/en/us/support/docs/ip/ip-version-6-ipv6/213272-troubleshoot-ipv6-dynamic-address-assign.html
- Cisco Catalyst 9200 Series IP Configuration Guide, Release 17.15.x, DHCPv6 stateful and prefix-delegation examples: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9200/software/release/17-15/configuration_guide/ip/b_1715_ip_9200_cg.pdf
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862

## Issues Found
- The stateful DHCPv6 example implied that setting RA managed/other flags alone was enough. I added `ipv6 nd prefix default 1800 1800 no-autoconfig` so the example disables SLAAC address creation for a stateful deployment, matching Cisco guidance.
- The `import all` line under `ipv6 dhcp pool` was not valid for this DHCPv6 server example. I removed it because Cisco documents option-specific DHCPv6 pool subcommands rather than a blanket `import all` in this context.
- The prefix-delegation section said it was carving /56s from a /32, but the configured local pool was `/40`. I corrected the explanation to match the actual configuration.
- The address exclusion section suggested an IPv4-style exclusion workflow that Cisco IOS DHCPv6 does not provide. I rewrote it to explain that DHCPv6 address pools are prefix-based and infrastructure addresses should be assigned statically instead.
- The static host reservation example used unsupported DHCPv6 address-reservation syntax. I replaced it with a valid static prefix-delegation reservation keyed by client DUID, which Cisco IOS does support.
- The verification section used `show ipv6 dhcp statistics`, which is not the documented operational command set for this feature. I replaced it with `show ipv6 dhcp`, which is documented and useful for confirming the router DHCPv6 identity.
- The sample binding output had lifetimes and T1/T2 values that did not match the configured pool. I corrected the output so the preferred lifetime, valid lifetime, T1, and T2 are internally consistent with RFC 8415 behavior.
- The troubleshooting example used `clear ipv6 dhcp binding *`, which is not the documented syntax. I corrected it to `clear ipv6 dhcp binding` for clearing all bindings and used a client IPv6 address for the single-binding example.
- The best-practices section incorrectly tied T1 and T2 to the valid lifetime. I corrected it to preferred lifetime, consistent with RFC 8415.

## Review Notes
The post is now technically sound for Cisco IOS and IOS-XE DHCPv6 server basics, but exact command availability can still vary by platform and software train. Very old images should be checked against their specific command reference before use in production.
