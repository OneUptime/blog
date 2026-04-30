# Validation Summary: How to Configure IPv6 for CMTS Equipment

## Status
validated

## Post Type
Guide

## Technologies Covered
- DOCSIS 3.0
- Cisco CMTS (uBR / cBR)
- IPv6
- DHCPv6 relay
- DHCPv6 Prefix Delegation (PD)
- ISC Kea DHCPv6

## Sources Consulted
- Cisco cBR Converged Broadband Routers DOCSIS Software Configuration Guide for Cisco IOS XE 17.18, "IPv6 on Cable" - https://www.cisco.com/c/en/us/td/docs/cable/cbr/configuration/guide/b_cbr_docsis_full_book_xe17_18/ipv6oncable.html
- Cisco CMTS Cable Command Reference, including `cable ipv6 source-verify` - https://www.cisco.com/c/en/us/td/docs/cable/cmts/cmd_ref/b_cmts_cable_cmd_ref/cable_e_through_cable_i.html
- Cisco CMTS Cable Command Reference, including `show cable modem ipv6`, `show cable modem ipv6 prefix`, and `show cable modem ipv6 summary` - https://www.cisco.com/c/en/us/td/docs/cable/cmts/cmd_ref/b_cmts_cable_cmd_ref/cable_commands__show_cable_m_to_show_cable_u.html
- Kea Administrator Reference Manual, "The DHCPv6 Server" - https://kea.readthedocs.io/en/kea-3.0.0/arm/dhcp6-srv.html
- Kea Administrator Reference Manual, latest documentation index - https://kea.readthedocs.io/en/latest/
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://www.rfc-editor.org/rfc/rfc8415
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://www.rfc-editor.org/rfc/rfc4862
- RFC 6177, "IPv6 Address Assignment to End Sites" - https://www.rfc-editor.org/rfc/rfc6177.html
- RFC 7084, "Basic Requirements for IPv6 Customer Edge Routers" - https://www.rfc-editor.org/rfc/rfc7084

## Issues Found
- The sample IPv6 addresses used non-hex placeholders such as `cmts`, `dhcp`, `subs`, `home`, and `mgmt`, which are not valid IPv6 syntax. I replaced them with valid documentation prefixes.
- The Cisco example put subscriber IPv6 configuration directly on the cable interface and used commands that do not match the documented CMTS workflow, including `ipv6 helper-address`, `cable dhcpv6-giaddr policy`, and the older `ipv6 nd ra-interval` form. I corrected the example to use `ipv6 unicast-routing`, bundle-interface IPv6 configuration, `ipv6 dhcp relay destination`, and cable-interface `cable ip-init` / `cable bundle` commands documented for CMTS IPv6 deployments.
- The DOCSIS overview implied that subscribers normally receive fixed `/56` or `/48` delegated prefixes and described config-file delivery as a URL returned directly in the DHCPv6 example flow. I updated the wording to reflect operator-defined delegated prefix sizes and the TFTP-based config-file retrieval model used in DOCSIS provisioning.
- The monitoring block was labeled as `bash` even though the commands are Cisco EXEC commands, and it included commands that were either generic or not aligned with the CMTS relay workflow. I changed the block to `text` and replaced the commands with documented CMTS verification commands for IPv6 modems, prefixes, and subscriber summaries.
- The Kea DHCPv6 example also used invalid IPv6 prefixes. I corrected the subnet, relay, pool, and prefix-delegation values so the JSON now matches valid Kea syntax and semantics.

## Review Notes
- Cisco CMTS IPv6 configuration is bundle-centric: Cisco documents that most IPv6 subscriber features are configured on the bundle interface, with the cable interface primarily setting provisioning mode and bundle association.
- Kea interface names are host-specific. The example now uses `eth0` as a conventional placeholder, but production deployments should use the actual server interface name.
- Many DOCSIS access networks are dual-stack in production. The corrected example is valid for IPv6-focused provisioning, but dual-stack deployments would typically use the corresponding dual-stack provisioning mode.
