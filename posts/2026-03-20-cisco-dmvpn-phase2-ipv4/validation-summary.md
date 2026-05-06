# Validation Summary: How to Configure DMVPN Phase 2 with IPv4 on Cisco Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- DMVPN Phase 2
- NHRP
- EIGRP
- GRE
- IPsec
- IPv4

## Sources Consulted
- Cisco, "Configuring NHRP" (Cisco IOS Release 15S): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nhrp/configuration/15-s/nhrp-15-s-book/config-nhrp.html
- Cisco, "Configuring EIGRP" (Cisco IOS 15.0S): https://www.cisco.com/en/US/docs/ios-xml/ios/iproute_eigrp/configuration/15-0s/Configuring_EIGRP.html
- Cisco, "Cisco IOS IP Addressing Services Command Reference - ip nat source through iterate-ip-addrs": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-i4.html
- Cisco, "IP Addressing Configuration Guide, Cisco IOS XE 17.x - Configuring NHRP": https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_config-nhrp-0.html
- Cisco, "Cisco IOS Security Command Reference: Commands S to Z" (`show dmvpn`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-cr-book/sec-cr-s4.html
- Cisco, "Dynamic Multipoint IPsec VPNs (Using Multipoint GRE/NHRP to Scale IPsec VPNs)": https://www.cisco.com/c/en/us/support/docs/security-vpn/ipsec-negotiation-ike-protocols/41940-dmvpn.html

## Issues Found
- The post originally treated `ip nhrp redirect` on the hub and `ip nhrp shortcut` on the spoke as DMVPN Phase 2 changes. Cisco documents those commands as part of NHRP shortcut switching used for DMVPN Phase 3 behavior, not standard Phase 2. I removed those commands from the Phase 2 guidance and replaced them with the actual Phase 2 EIGRP requirements on the hub tunnel: `no ip split-horizon eigrp 100` and `no ip next-hop-self eigrp 100`.
- The original description, introduction, traffic-flow section, and conclusion described Phase 2 as sending the first packet through the hub and then using an NHRP redirect to build a direct path. Cisco’s Phase 2 documentation says the routing protocol advertises the remote spoke as the IP next hop; if the NHRP mapping is missing, the spoke sends an NHRP resolution request and then forwards directly once it learns the NBMA mapping. I corrected those explanations.
- The verification command `show ip nhrp type dynamic` used invalid syntax. Cisco documents the command as `show ip nhrp [dynamic | static] [type number]`. I corrected it to `show ip nhrp dynamic`.

## Review Notes
- The post uses classic EIGRP configuration syntax (`router eigrp 100`, `no ip split-horizon eigrp 100`, and `no ip next-hop-self eigrp 100`). That syntax remains valid for Cisco IOS, although newer IOS XE documentation also covers named EIGRP syntax.
- The sample `show dmvpn` output is illustrative and consistent with Cisco’s documented `S` (static) and `D` (dynamic) attributes.
