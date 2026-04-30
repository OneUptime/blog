# Validation Summary: How to Configure IPv6 for Out-of-Band Management

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- IPv6 addressing and documentation prefixes
- Out-of-band management network design
- Linux `/etc/network/interfaces`
- Opengear console server access methods
- Cisco IOS / IOS XE IPv6 management-plane configuration
- IPMI / `ipmitool` LAN6 configuration
- Dell iDRAC `racadm`
- HPE iLO `hponcfg` / RIBCL
- Redfish over IPv6
- Net-SNMP CLI over IPv6
- Network reachability checks with `ping6` and `nc`

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- Opengear, Unauthenticated SSH to Console Ports: https://opengear.com/docs/OM/Content/Unauthenticated%20SSH%20to%20Console%20Ports.htm
- Opengear, Configure Raw TCP Access for Serial Ports: https://resources.opengear.com/om/manuals/24.11.2/Content/Configure_Serial_Ports.htm
- Cisco IOS IPv6 Command Reference, `ipv6 access-class`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IOS IPv6 Configuration Guide, Addressing and Basic Connectivity: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/15-0s/ipv6-15-0s-book/ip6-addrg-bsc-con.html
- Cisco IOS IPv6 Command Reference, `show ipv6 route`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s5.html
- `ipmitool` upstream source, `lib/ipmi_lanp6.c`: https://raw.githubusercontent.com/ipmitool/ipmitool/master/lib/ipmi_lanp6.c
- Dell iDRAC RACADM CLI Guide, `getniccfg`: https://www.dell.com/support/manuals/en-us/idrac9-lifecycle-controller-v6.x-series/idrac9_6.xx_racadm_pub/getniccfg?guid=guid-d0d18e50-cfb4-46b3-9ca6-5778f0e678b7&lang=en-us
- Dell iDRAC RACADM CLI Guide, `cfgIPv6AutoConfig`: https://www.dell.com/support/manuals/en-vn/idrac9-lifecycle-controller-v3.1-series/idrac_v3.15.15.15_racadm/idrac.ipv6.autoconfig-read-or-write?guid=guid-b5731aa0-d61b-40d9-ad11-d5ddce57681a&lang=en-us
- HPE iLO 6 Scripting and Command Line Guide, `MOD_NETWORK_SETTINGS` parameters: https://support.hpe.com/hpesc/public/docDisplay?docId=sd00002199en_us&docLocale=en_US&page=GUID-D7147C7F-2016-0901-06CF-000000000B6A.html
- HPE iLO 5 Scripting and Command Line Guide, `MOD_NETWORK_SETTINGS`: https://support.hpe.com/hpesc/public/docDisplay?docId=a00018323en_us&docLocale=en_US&page=GUID-D7147C7F-2016-0901-06CF-000000000B7F.html
- HPE iLO 5 Redfish API Reference: https://hewlettpackard.github.io/ilo-rest-api-docs/ilo5/
- Net-SNMP FAQ, IPv6 command-line address syntax: https://www.net-snmp.org/wiki/index.php/FAQ%3AApplications_28
- Net-SNMP `snmpcmd` man page: https://www.net-snmp.org/docs/man/snmpcmd.html

## Issues Found
1. The post used `2001:db8:oob::...` throughout. That is not valid IPv6 syntax because `oob` is not hexadecimal. I replaced the examples with the valid documentation prefix `2001:db8:200::/48` and corresponding host addresses, consistent with RFC 3849 and RFC 4291.
2. The Opengear direct-console SSH example used `-p 7001`, which does not match current Opengear SSH port-access documentation. I changed it to the documented per-port SSH username form `admin+port01@...`, and I changed the raw-TCP monitoring example to the documented `4000 + port` range with an explicit note that Raw TCP must be enabled.
3. The Cisco section mixed incompatible syntax: `interface Management1` is not Cisco IOS / IOS XE switch syntax, but `line vty` and `ipv6 access-class` are IOS / IOS XE commands. It also used an invalid verification command (`show ipv6 route Management`) and omitted `ipv6 unicast-routing`. I converted the snippet into a consistent IOS / IOS XE switch example using `Vlan200`, added `ipv6 unicast-routing`, fixed the default route syntax, and corrected the verification commands.
4. The `ipmitool` LAN6 configuration commands were not valid upstream `ipmitool` syntax. I replaced them with the actual LAN6 parameter names documented in `ipmi_lanp6.c` (`enables`, `static_addr`, `rtr_cfg`) and added `-I lanplus` to the remote IPMI and SOL examples, which is required for reliable remote IPMI v2.0 / SOL usage.
5. The Dell iDRAC example set the static IPv6 address before disabling auto-configuration and used attribute names / values that are less reliable across current RACADM docs. I changed it to disable `iDRAC.IPv6.AutoConfig` first, then use the documented `racadm setniccfg -s6 <addr> <prefix> <gateway>` flow.
6. The HPE iLO XML used the wrong RIBCL structure (`MOD_GLOBAL_SETTINGS` / `IPV6_SETTINGS`) and non-existent tag names such as `DHCPV6_ENABLED`. I replaced it with the documented `MOD_NETWORK_SETTINGS` block and the supported IPv6 tags (`IPV6_ADDRESS`, `IPV6_DEFAULT_GATEWAY`, `IPV6_ADDR_AUTOCFG`, `DHCPV6_STATELESS_ENABLE`, `DHCPV6_STATEFUL_ENABLE`).
7. The Net-SNMP IPv6 example passed a bare IPv6 literal as the target host. Net-SNMP’s documented IPv6 transport syntax requires an explicit transport such as `udp6:[addr]:161`, so I corrected the example accordingly.
8. The closing paragraph said OOB IPv6 ensures administrators can "always" reach and recover devices. That overstates what OOB guarantees. I softened it to reflect the actual dependency on the OOB network remaining available.

## Review Notes
- `ping6` is still valid on current iputils systems, even though modern distributions typically implement it as the same binary as `ping`.
- Opengear Raw TCP access is optional and disabled by default; the updated `nc` check only applies when that service is enabled per port.
- The HPE Redfish example uses `/redfish/v1/Systems/1/`, which is valid for iLO. More generally, Redfish clients should discover the correct `ComputerSystem` URI from the `/redfish/v1/Systems/` collection rather than assuming a vendor-independent fixed path.
- Local checks: `validation.json` was validated with `jq`. Runtime validation against real switches, console servers, BMCs, or Redfish endpoints was not possible in this workspace, so the review relied on vendor documentation, RFCs, upstream source, and local CLI help for `ping6`, `nc`, and `ssh`.
