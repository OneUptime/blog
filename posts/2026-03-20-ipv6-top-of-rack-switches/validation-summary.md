# Validation Summary: How to Configure IPv6 for Top-of-Rack Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Top-of-Rack switching
- Arista EOS
- Cisco Nexus NX-OS
- SLAAC / Router Advertisements
- eBGP
- IPv6 RA Guard
- MLD snooping

## Sources Consulted
- Arista EOS IPv6 manual - https://www.arista.com/en/um-eos/eos-ipv6
- Arista EOS BGP manual - https://www.arista.com/en/um-eos/eos-border-gateway-protocol-bgp
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 10.6(x) - https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/m-n9k-configuring-ipv6-93x.html
- Cisco Nexus 9000 Series NX-OS Command Reference, `ipv6 nd prefix` / `ipv6 nd ra-interval` syntax - https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/102x/command-reference/config/b_n9k_config_commands_1021/m_i_cmds.html
- Cisco Nexus 9000 Series NX-OS Security Configuration Guide, Release 10.6(x), IPv6 First Hop Security - https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/security/cisco-nexus-9000-series-nx-os-security-configuration-guide-release-106x/m-configuring-ipv6-first-hop-security.html
- Cisco Nexus 9000 Series NX-OS Multicast Routing Configuration Guide, Release 10.6(x) - https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/multicast/cisco-nexus-9000-series-nx-os-multicast-routing-configuration-guide-106x.pdf
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- RFC 3849, IPv6 Address Prefix Reserved for Documentation - https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:fabric:1::1/64` and `2001:db8:rack1:100::1/64`. I replaced them with valid hexadecimal documentation addresses under `2001:db8::/32`.
- The Arista EOS RA command used Cisco-style syntax: `ipv6 nd ra-interval`. I corrected it to the EOS form `ipv6 nd ra interval`.
- The Cisco Nexus SLAAC example used invalid syntax: `eui-64` is not the NX-OS keyword form, and the example did not need EUI-64 at all. I replaced it with a fixed SVI address and a valid advertised prefix.
- The Arista BGP example mixed invalid and incomplete syntax. I corrected `peer group` to `peer-group`, changed the interface neighbors to documented `neighbor interface ... peer-group ... remote-as ...` form, and removed the incorrect `remote-as external` usage.
- The BGP `network 2001:db8:1::/56` example would not originate the summary route unless that `/56` existed in the RIB. I added a matching `ipv6 route 2001:db8:1::/56 Null0` so the example would work as described.
- The post described the BGP section as using unnumbered/link-local peering even though the interfaces were configured with global IPv6 addresses. I corrected that wording to describe peering over IPv6 uplinks.
- The Cisco RA Guard example included `no-advertise`, which is an IPv6 ND prefix option rather than a documented RA Guard policy command. I removed it.
- The RA Guard interface example used an invalid interface-range form. I changed it to a valid per-interface attachment example.
- The Arista verification commands included `show bgp ipv6 unicast summary` and `show ipv6 nd interface Vlan100`, which do not match the documented EOS commands. I corrected them to `show ipv6 bgp summary` and `show ipv6 nd ra internal state vlan 100`.
- The MLD snooping example was incomplete and used the wrong VLAN-mode syntax. I added the required global enable commands, changed `vlan 100` to `vlan configuration 100`, and changed the querier address to a link-local address as required by the NX-OS command.

## Review Notes
- Cisco documents IPv6 RA Guard on Nexus 9000 as platform- and release-dependent; the 10.6(x) guide notes support beginning with certain Nexus 9300-GX platforms in NX-OS 10.1(1), with TCAM programming requirements.
- The MLD snooping querier command is only needed when there is no multicast router already acting as the querier on that VLAN; Cisco documents it for VLANs where PIM and MLD are not otherwise configured.
