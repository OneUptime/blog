# Validation Summary: How to Configure IPv6 on Huawei Network Equipment

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Huawei VRP
- IPv6 addressing
- IPv6 static routing
- IPv6 Neighbor Discovery and Router Advertisements
- OSPFv3
- BGP for IPv6
- IPv6 ACLs

## Sources Consulted
- Huawei VRP `ipv6 enable` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100331435/AEM10132/05/resources/dc/ipv6_enable_interface_view.html
- Huawei VRP `ipv6 address` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/17/resources/cli/ipv6_address.html
- Huawei VRP IPv6 static route configuration: https://info.support.huawei.com/hedex/api/pages/EDOC1100277644/AEM10221/04/resources/vrp/dc_vrp_static-route_disjoin_cfg_0009.html
- Huawei VRP `display ipv6 interface` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100331435/AEM10132/04/resources/dc/display_ipv6_interface.html
- Huawei VRP `ipv6 nd ra halt` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/18/resources/cli_vrp/ipv6_nd_ra_halt.html
- Huawei VRP `ipv6 nd ra` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/18/resources/cli_vrp/ipv6_nd_ra.html
- Huawei VRP `ipv6 nd ra router-lifetime` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100331435/AEM10132/04/resources/dc/ipv6_nd_ra_router-lifetime.html
- Huawei VRP `ipv6 nd ra prefix` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/18/resources/cli_vrp/ipv6_nd_ra_prefix.html
- Huawei VRP `ipv6 nd autoconfig managed-address-flag` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/18/resources/cli_vrp/ipv6_nd_autoconfig_managed-address-flag.html
- Huawei VRP `ipv6 nd autoconfig other-flag` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/18/resources/cli_vrp/ipv6_nd_autoconfig_other-flag.html
- Huawei VRP `ipv6 nd ra dns-server` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100363264/AEN0403J/06/resources/command/yunshan/NDRADNSSERVER%28NDOM%29.html
- Huawei VRP `ospfv3` command reference: https://support.huawei.com/enterprise/en/doc/EDOC1100468724/ca7f75f8/ospfv3
- Huawei VRP `ospfv3 area` command reference: https://support.huawei.com/enterprise/en/doc/EDOC1100325913/c0ac16e8/ospfv3-area
- Huawei VRP `display ospfv3 peer` command reference: https://support.huawei.com/enterprise/en/doc/EDOC1100325911/1bfe8ad9/display-ospfv3-peer
- Huawei VRP BGP IPv6 `peer ... enable` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100277644/AEM10221/04/resources/command/yunshan/PEER-IPV6-ENABLE%28BGPIPV6%29.html
- Huawei VRP `display bgp peer` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100334321/AEM1020X/06/resources/dc/display_bgp_peer.html
- Huawei VRP BGP `network` command reference: https://support.huawei.com/enterprise/en/doc/EDOC1100214493/f0d8283e/network-bgp
- Huawei VRP IPv6 ACL creation guide: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/18/resources/admin/sec_admin_acl6_0010.html
- Huawei VRP IPv6 ACL rule command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/17/resources/cli/rule_acl6.html
- Huawei VRP `display ipv6 neighbors` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100331435/AEM10132/04/resources/dc/display_ipv6_neighbors.html
- Huawei VRP `ping ipv6` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100149308/AEJ0713J/17/resources/cli/ping_ipv6.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/rfc4861/
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 5340, OSPF for IPv6: https://datatracker.ietf.org/doc/rfc5340/
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106

## Issues Found
- The default static-route example used `2001:db8:isp::1`, which is not a valid IPv6 literal because `isp` is not hexadecimal. I replaced it with a valid documentation-prefix example and corrected the interface tokenization to `GigabitEthernet 0/0/1`, which matches VRP command syntax.
- The Router Advertisement section used multiple non-existent or incorrect VRP commands: `ipv6 nd ra interval`, `ipv6 nd ra lifetime`, `ipv6 nd prefix`, `undo ipv6 nd managed-address-flag`, and `undo ipv6 nd other-config-flag`. I replaced them with the documented VRP forms: `undo ipv6 nd ra halt`, `ipv6 nd ra max-interval`, `ipv6 nd ra min-interval`, `ipv6 nd ra router-lifetime`, `ipv6 nd ra prefix`, `undo ipv6 nd autoconfig managed-address-flag`, and `undo ipv6 nd autoconfig other-flag`.
- The RA section claimed to enable RA but never actually enabled RA transmission. On Huawei VRP, RA messages are suppressed by default on interfaces, so I added `undo ipv6 nd ra halt`.
- The BGP IPv6 example advertised `network 2001:db8:: 48`, but the post only configured `2001:db8::1/128` on LoopBack 0. I changed the `network` statement to `2001:db8::1 128` so the example advertises a route that actually exists in the earlier configuration.
- The verification command `display bgp ipv6 unicast peer` did not match Huawei's documented display syntax. I corrected it to `display bgp ipv6 peer`.
- The verification command `ping ipv6 2606:4700:4700::1111 -c 3` used the option order incorrectly for VRP. I corrected it to `ping ipv6 -c 3 2606:4700:4700::1111`.
- The heading `Configure IPv6 ACL (Traffic Classifier)` was technically inaccurate because the snippet only creates an ACL and does not create a Huawei `traffic classifier`. I shortened the heading to `Configure IPv6 ACL`.
- One OSPFv3 interface command used `interface GigabitEthernet0/0/0` instead of VRP's documented `interface-type interface-number` form. I corrected it to `interface GigabitEthernet 0/0/0`.

## Review Notes
- No remaining technical errors were found after the corrections above.
- The post uses `2001:db8::/32`, which is the correct documentation prefix for examples.
- Exact command availability can still vary by hardware family and VRP release, especially for RA DNS options, but the corrected syntax matches current official Huawei VRP documentation.
