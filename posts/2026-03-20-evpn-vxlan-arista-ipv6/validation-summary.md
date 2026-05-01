# Validation Summary: How to Configure EVPN VXLAN with IPv6 on Arista EOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Arista EOS
- EVPN
- VXLAN
- IPv6
- BGP
- IS-IS
- OSPFv3
- CloudVision (CVP)
- Python (`cvprac`)

## Sources Consulted
- Arista EOS VXLAN Configuration: https://www.arista.com/en/um-eos/eos-vxlan-configuration
- Arista EOS VXLAN Commands: https://www.arista.com/en/um-eos/eos-vxlan-commands
- Arista EOS Border Gateway Protocol (BGP): https://www.arista.com/en/um-eos/eos-border-gateway-protocol-bgp
- Arista EOS IS-IS: https://www.arista.com/en/um-eos/eos-is-is
- Arista EOS VRRP and VARP: https://www.arista.com/en/um-eos/eos-vrrp-and-varp
- Arista TOI tag for IPv6 underlay support: https://www.arista.com/en/support/toi/tag/ipv6-underlay
- Arista TOI tag for `ipv6 address virtual`: https://www.arista.com/en/support/toi/tag/ipv6-address-virtual
- Arista CloudVision as-a-Service Quickstart Guide: https://www.arista.com/assets/data/pdf/qsg/qsg-books/QS_CloudVision_as_a_Service.pdf
- Arista official `cvprac` client repository: https://github.com/aristanetworks/cvprac
- Arista `cvprac` configlet API implementation: https://raw.githubusercontent.com/aristanetworks/cvprac/master/cvprac/cvp_api.py

## Issues Found
- The post omitted `vxlan encapsulation ipv6`, which is required on the VTEP when the VXLAN underlay is IPv6. I added it under `interface Vxlan1`.
- The underlay snippet included `daemon Snmp`, which was not part of the EVPN/VXLAN configuration shown and was incomplete in this context. I removed it.
- The verification section used `show vxlan interface`; Arista documents the operational check as `show interfaces vxlan 1`. I corrected the command.
- The CloudVision example posted configuration data to `getCvpInfo.do`, which is an information endpoint rather than a configlet-creation workflow. It also built an invalid standalone `vxlan vlan ...` configlet body and disabled TLS verification. I replaced it with Arista’s official `cvprac` client flow and a valid configlet body under `interface Vxlan1`.
- The post did not identify the documented minimum EOS releases for EVPN VXLAN IPv6 underlay support and VXLAN routing over an IPv6 underlay. I added those release boundaries.

## Review Notes
- The post uses `ipv6 address virtual` for the IPv6 anycast gateway. Arista documents this as a newer VXLAN anycast capability; older EOS releases typically use `ipv6 virtual-router address` instead.
- Arista notes that on fresh CloudVision 2025.2.X and later installations, the network provisioning service is disabled by default. The `cvprac` configlet workflow depends on that service being enabled.
