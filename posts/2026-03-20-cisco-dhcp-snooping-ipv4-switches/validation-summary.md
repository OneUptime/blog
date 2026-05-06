# Validation Summary: How to Configure DHCP Snooping for IPv4 on Cisco Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE switching
- DHCP snooping for IPv4
- DHCP Option 82
- Dynamic ARP Inspection
- IP Source Guard
- Port security

## Sources Consulted
- Cisco, FHS and SISF Configuration Guide - DHCP Snooping (Cisco IOS XE 17): https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/dhcp-snooping.html
- Cisco, DHCP Snooping PDF companion (current Catalyst campus documentation): https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/dhcp-snooping.pdf
- Cisco, Cisco IOS IP Addressing Services Command Reference - `ip dhcp snooping information option` and related commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-i2.html
- Cisco, IP Addressing Services Configuration Guide, Cisco IOS XE 17.14.x (Catalyst 9400 Switches) - DHCP snooping database syntax: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/17-14/configuration_guide/ip/b_1714_ip_9400_cg.pdf
- Cisco, Security Configuration Guide, Cisco IOS XE 17.15.x (Catalyst 9300 Switches) - Port Security: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/sec/b_1715_sec_9300_cg/port_security.html

## Issues Found
- The base configuration disabled DHCP Option 82 unconditionally. Cisco documents Option 82 insertion as enabled by default, so the example was corrected to make `no ip dhcp snooping information option` optional and only for environments where the upstream DHCP server rejects Option 82.
- The binding database examples used `flash:filename` style paths. Current Cisco IOS XE documentation shows the database destination as `flash:/filename`, so both database examples were updated to `flash:/dhcp-snooping.db`.
- The trust-port wording implied only a direct server connection. This was tightened to refer to the uplink or trunk that receives legitimate DHCP server replies, which better matches Cisco’s trusted-interface behavior.

## Review Notes
- Cisco documents that when DHCP relay is configured on the VLAN SVI, the server-facing Layer 3 path does not necessarily require `ip dhcp snooping trust` because the relay sends unicast packets to the DHCP server.
- Cisco recommends a network-based binding database destination such as TFTP for larger deployments because local flash/NVRAM capacity is limited, but storing the database on local flash is still valid.
