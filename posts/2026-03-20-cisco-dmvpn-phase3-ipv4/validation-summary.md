# Validation Summary: How to Configure DMVPN Phase 3 with IPv4 on Cisco Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- DMVPN Phase 3
- NHRP
- EIGRP
- Multipoint GRE tunnels
- IPsec tunnel protection

## Sources Consulted
- Cisco IOS IP Addressing Services Command Reference: `ip nhrp redirect`, `ip nhrp shortcut`, `ip nhrp holdtime`, `ip nhrp map` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-i4.html
- Cisco IOS XE NHRP Configuration Guide: Shortcut Switching Enhancements for NHRP in DMVPN Networks - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nhrp/configuration/xe-16-8/nhrp-xe-16-8-book/nhrp-switch-enhancemts-dmvpn.html
- Cisco Dynamic Multipoint VPN Configuration Guide: Spoke-to-Spoke NHRP Summary Maps - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_conn_dmvpn/configuration/xe-3s/sec-conn-dmvpn-xe-3s-book/sec-conn-dmvpn-summ-maps.html
- Cisco Support: Configure Phase-3 Hierarchical DMVPN with Multi-Subnet Spokes - https://www.cisco.com/c/en/us/support/docs/security/dynamic-multipoint-vpn-dmvpn/211292-Configure-Phase-3-Hierarchical-DMVPN-wit.html
- Cisco Support: Configure BGP over DMVPN Phase 3 - https://www.cisco.com/c/en/us/support/docs/security/dynamic-multipoint-vpn-dmvpn/222585-configure-bgp-over-dmvpn-phase-3.html
- RFC 2332: NBMA Next Hop Resolution Protocol (NHRP) - https://www.rfc-editor.org/rfc/rfc2332

## Issues Found
- The description incorrectly referred to "NHRP summarization." I changed it to route summarization plus NHRP redirect/shortcut, which matches Cisco's documented Phase 3 behavior.
- The introduction said the hub injects NHRP routes into spokes. I corrected this to explain that the hub sends NHRP redirects and spokes install shortcut routes for specific destinations.
- The phase comparison overstated the shortcut behavior as `/32` route installation. I changed this to the broader and accurate "NHRP shortcut routes/overrides" because Cisco documents both NHRP-installed routes and next-hop overrides.
- The EIGRP summary example summarized the tunnel subnet `10.100.0.0/24`, which is not the relevant Phase 3 scaling use case. I replaced it with a LAN-prefix summary example and added `no ip split-horizon eigrp 100` to match Cisco's Phase 3 EIGRP examples.
- The traffic-flow example incorrectly used the tunnel subnet as the summarized destination and described a fixed `/32` shortcut to a public NBMA address. I corrected it to show a summarized remote LAN destination, followed by NHRP resolution of the remote spoke and installation of a shortcut route.
- The shortcut aging statement claimed a default of 120 seconds. I changed it to reference NHRP holdtime/timers because Cisco documents holdtime defaults and smart-default behavior separately by platform and release.

## Review Notes
- `ip nhrp shortcut` is enabled by default in Cisco IOS XE 16.6.2 and Cisco IOS 15.7(2)M and later, but explicitly configuring it remains valid.
- The verification commands in the post are valid. Cisco also documents `show ip nhrp shortcut` and `show ip route next-hop-override` as useful Phase 3 verification commands.
