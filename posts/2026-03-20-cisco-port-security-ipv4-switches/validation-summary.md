# Validation Summary: How to Configure Port Security with IPv4 on Cisco Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE switching
- Cisco port security
- DHCP snooping
- IP Source Guard
- VLAN access and voice VLAN configuration
- MAC address security on access ports

## Sources Consulted
- Cisco IOS XE 17.13.x Security Command Reference, `switchport port-security mac-address`, `switchport port-security maximum`, and `switchport port-security violation`: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/17-13/command_reference/b_1713_9400_cr/security_commands.html
- Cisco IOS XE 17 FHS and SISF Configuration Guide, IP Source Guard: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/ip-source-guard.html
- Cisco IOS XE 16.12.x Security Command Reference, `ip verify source`: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/16-12/command_reference/b_1612_9300_cr/b_1612_9300_cr_chapter_01011.html
- Cisco IOS IP Addressing Services Command Reference, `ip dhcp snooping vlan`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-i2.html
- Cisco IOS Identity-Based Networking Services Command Reference, `ip dhcp snooping trust`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ibns/command/ibns-cr-book/ibns-cr.html
- Cisco IOS Security Command Reference, `show port-security`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-cr-book/sec-cr-s5.html

## Issues Found
- The static MAC example used colon-separated notation. Cisco IOS port-security examples use 48-bit MAC addresses in Cisco format, so the example was corrected to `001A.2B3C.4D5E`.
- The introduction described port security as complementing "IPv4 access control at Layer 2." Port security is a Layer 2 feature; the text was corrected to describe it as complementing IPv4 protections such as DHCP snooping and IP Source Guard.
- The voice VLAN example used `switchport port-security maximum 3` for an "IP phone + PC" example. Cisco's guidance for a port with one phone and one attached PC is a maximum of 2 secure addresses, so the example was corrected.
- The violation mode table understated `restrict` behavior and only partially described `shutdown`. The table was updated to reflect Cisco-documented logging, counter, and SNMP-trap behavior.
- The conclusion said `restrict` mode is for cases where automatic recovery is preferred. `restrict` does not error-disable the port, so automatic errdisable recovery is not the relevant distinction. The sentence was corrected.
- The sticky MAC comment was tightened to reflect Cisco behavior more accurately: sticky learning adds learned MAC addresses to the running configuration.

## Review Notes
- Port security itself is protocol-agnostic and operates at Layer 2; the IPv4-specific part of this post is the DHCP snooping and IP Source Guard combination.
- On newer IOS XE releases, `ip verify source tracking` is used for static-host scenarios. The post's plain `ip verify source` example remains valid for DHCP-learned hosts.
