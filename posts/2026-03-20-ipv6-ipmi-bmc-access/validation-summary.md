# Validation Summary: How to Configure IPv6 for IPMI/BMC Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPMI
- BMC
- Dell iDRAC / RACADM
- HPE iLO / HPONCFG / RIBCL
- `ipmitool`
- Redfish API

## Sources Consulted
- Dell iDRAC RACADM `setniccfg` documentation: https://www.dell.com/support/manuals/en-us/poweredge-r250/idrac9_7.xx_racadm_pub/setniccfg?guid=guid-e4833698-0656-47ff-8615-a5962f9835da&lang=en-us
- Dell iDRAC IPv6 attribute registry / RACADM attributes (`iDRAC.IPv6.*` and `iDRAC.IPv6Static.*`): https://www.dell.com/support/manuals/en-us/poweredge-r660/idrac9_ar_guide_7xx/idrac-attributes?guid=guid-279fe5ad-b105-4147-b5b1-1483c2f73e5c&lang=en-us
- HPE iLO 6 Scripting and Command Line Guide, `MOD_NETWORK_SETTINGS`: https://support.hpe.com/hpesc/public/docDisplay?docId=sd00002199en_us&docLocale=en_US&page=GUID-D7147C7F-2016-0901-06CF-000000000B7F.html
- HPE iLO 6 Scripting and Command Line Guide, `MOD_NETWORK_SETTINGS` parameters: https://support.hpe.com/hpesc/public/docDisplay?docId=sd00002199en_us&docLocale=en_US&page=GUID-D7147C7F-2016-0901-06CF-000000000B6A.html
- HPE iLO 6 Scripting and Command Line Guide, `GET_NETWORK_SETTINGS`: https://support.hpe.com/hpesc/public/docDisplay?docId=sd00002199en_us&docLocale=en_US&page=GUID-D7147C7F-2016-0901-06CF-000000000B20.html
- HPE iLO 5 Scripting and Command Line Guide, HPONCFG usage: https://support.hpe.com/hpesc/public/docDisplay?docId=a00018323en_us&docLocale=en_US&page=GUID-D7147C7F-2016-0901-06CF-000000000569.html
- Upstream `ipmitool` LAN IPv6 parameter implementation: https://raw.githubusercontent.com/ipmitool/ipmitool/master/lib/ipmi_lanp6.c
- Upstream `ipmitool` remote interface socket handling (`AF_INET` / `AF_INET6`): https://raw.githubusercontent.com/ipmitool/ipmitool/master/src/plugins/ipmi_intf.c
- Upstream `ipmitool` manpage source: https://raw.githubusercontent.com/ipmitool/ipmitool/master/doc/ipmitool.1.in
- DMTF Redfish `ComputerSystem` schema: https://raw.githubusercontent.com/DMTF/Redfish-Publications/main/openapi/ComputerSystem.v1_20_2.yaml
- DMTF Redfish `Resource_ResetType` enum: https://raw.githubusercontent.com/DMTF/Redfish-Publications/main/openapi/Resource.yaml
- RFC 3986, URI generic syntax for IPv6 literals in URLs: https://www.rfc-editor.org/rfc/rfc3986.html

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:oob::201`. IPv6 hextets are hexadecimal only, so `oob` is not valid. I replaced the examples with valid documentation-prefix addresses under `2001:db8:100::/64`.
- The Dell iDRAC static IPv6 examples used incorrect RACADM property names (`iDRAC.IPv6.Address1`, `PrefixLength1`, `Gateway1`) and an invalid `Autoconfig` command for DHCPv6 mode selection. I corrected the static properties to `iDRAC.IPv6Static.*`, changed `AutoConfig` to numeric `0`/`1`, and removed the unsupported `Autoconfig 2` line.
- The HPE iLO RIBCL example used unsupported IPv6 tags such as `IPV6_PREFIX_LENGTH`, `PREFER_IPV6`, `DHCPV6_ENABLED`, and `IPV6_STATIC_IP_ADDRESS_1`. I replaced them with documented `MOD_NETWORK_SETTINGS` tags such as `IPV6_ADDRESS ... PREFIXLEN=`, `IPV6_DEFAULT_GATEWAY`, `IPV6_PREFERRED_PROTOCOL`, `IPV6_ADDR_AUTOCFG`, `DHCPV6_STATELESS_ENABLE`, and `DHCPV6_STATEFUL_ENABLE`.
- The HPE iLO XML examples used `RIBCL VERSION="2.23"` while the current HPE scripting guide examples use `VERSION="2.0"` for these commands. I aligned the examples to the documented format.
- The `ipmitool lan6` examples used non-existent parameter names such as `ipv6static`, `prefix_len`, `gateway`, and `ipv6_static_addr`. I replaced them with the upstream-documented `lan6` parameters: `enables`, `static_addr`, `rtr_cfg`, and `static_rtr`.
- The remote `ipmitool` examples omitted `-I lanplus`, which makes them unreliable on typical systems where the default interface is local `open`. I added `-I lanplus` to the remote IPMI examples.
- The mass-configuration script used `:` as the field delimiter even though IPv6 addresses contain colons, so its parsing would break immediately. I changed the delimiter to `|` and updated the parsing logic accordingly.

## Review Notes
- Remote IPMI over IPv6 depends on both the BMC implementation and the `ipmitool` build. Upstream `ipmitool` source supports IPv4 and IPv6 address families for remote connections, but vendor support for IPMI-over-IPv6 is still implementation-specific.
- The `lan6` default-router configuration requires both the IPv6 gateway address and the gateway MAC address. The example now reflects the actual parameter shape used by upstream `ipmitool`.
