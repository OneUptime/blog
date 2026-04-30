# Validation Summary: How to Configure IPv6 for CMTS (Cable Modem Termination Systems)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DOCSIS 3.0/3.1
- Cisco CMTS / Cisco uBR10012
- DHCPv6
- DHCPv6 Prefix Delegation
- ISC Kea DHCPv6
- MLD / IPv6 multicast

## Sources Consulted
- Cisco CMTS Router Layer 3 and Bundle Interface Features Configuration Guide - IPv6 on Cable: https://www.cisco.com/c/en/us/td/docs/cable/cmts/config_guide/b_cisco_cmts_scg/b_cisco_cmts_scg_chapter_0101011.html
- Cisco CMTS Router Layer 3 and Bundle Interface Features Configuration Guide - IPv6 on Cable (PDF): https://www.cisco.com/c/en/us/td/docs/cable/cmts/config_guide/b_CMTS_Router_Layer3_BundleInterface/b_CMTS_Router_Layer3_BundleInterface_chapter_01.pdf
- Cisco CMTS Troubleshooting and Network Management Configuration Guide - Maximum CPE and Host Parameters: https://www.cisco.com/c/en/us/td/docs/cable/cmts/config_guide/b_cisco_cmts_networkmgmt_trblshting/b_cisco_cmts_networkmgmt_trblshting_chapter_01000.html
- CableLabs Assigned Names and Numbers Specification: https://account.cablelabs.com/server/alfresco/06c0552a-8ca9-4a04-91cc-62bc5d0d3bed
- Kea Administrator Reference Manual - The DHCPv6 Server: https://kea.readthedocs.io/en/kea-2.6.4/arm/dhcp6-srv.html
- RFC 8415 - Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc8415
- Cisco IOS IPv6 Command Reference - MLD query interval and related commands: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_06.html

## Issues Found
- The Cisco CMTS example configured IPv6 directly on `Cable1/0/0`, but Cisco documents IPv6 cable features on the bundle interface, with the physical cable interface set to an IP provisioning mode and associated to the bundle. I moved the example to `Bundle1`, added the physical-interface `cable ip-init ipv6` / `cable bundle 1` lines, and kept DHCPv6 relay on the bundle interface.
- Multiple IPv6 example addresses were syntactically invalid because they used non-hexadecimal groups such as `cmts`, `dhcp`, `mgmt`, and `cable`. I replaced them with valid documentation-prefix examples under `2001:db8::/32`.
- The original Cisco ND command used `ipv6 nd ra-interval 30`, which does not match the documented command form used in Cisco CMTS examples. I corrected it to `ipv6 nd ra interval 5` and added the documented DHCPv6-related ND flags used in Cisco examples.
- The DOCSIS configuration section used fabricated keywords such as `IPv6CPEEnabled` and `IPv6PrefixDelegationEnabled`, which are not DOCSIS TLV names. I replaced that block with TLV-style examples based on documented DOCSIS / Cisco naming, including Network Access, Maximum Number of CPE, and the DOCSIS 3.0 MAX CPE IPv6 Prefix control.
- The Kea DHCPv6 example used invalid IPv6 literals. I replaced them with valid addresses and kept the configuration aligned with Kea’s documented `relay.ip-addresses` and `pd-pools` syntax.
- The verification section used less-specific or undocumented command forms for this use case. I changed the examples to documented CMTS commands for registered IPv6 cable modems and delegated-prefix inspection.
- The multicast section used `ipv6 mld join-group ff02::1` as if that were how to enable MLD. That command statically joins a group rather than enabling multicast routing. I replaced it with global `ipv6 multicast-routing` plus interface-level MLD version/query configuration.
- The conclusion still reflected the original incorrect framing around cable-interface configuration and DOCSIS “enable IPv6” keywords. I updated it to match the corrected bundle-interface and TLV-based guidance.

## Review Notes
- The post is now technically sound as a Cisco uBR10012 / classic Cisco CMTS-style example, but newer Cisco cBR / IOS XE platforms use adjacent documentation and may differ in surrounding operational details.
- MLD configuration is only one part of an end-to-end IPv6 multicast deployment; upstream multicast routing design (for example, PIM in routed multicast domains) is outside the scope of this post.
