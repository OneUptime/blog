# Validation Summary: How to Disable IP Directed Broadcast on Cisco Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- IPv4 directed broadcast
- Cisco interface configuration
- Access control lists (ACLs)
- ICMP
- Wake-on-LAN
- Smurf attack mitigation

## Sources Consulted
- Cisco IOS XE IP Addressing Configuration Guide, "Configuring IPv4 Broadcast Packet Handling": https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_iap-bph-0.html
- Cisco IOS Command Reference, `ip directed-broadcast`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_04.html
- Cisco security guidance, "Harden IOS Devices": https://www.cisco.com/c/en/us/support/docs/ip/access-lists/13608-21.html
- Cisco IOS XE command reference, `show ip interface`: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9600/software/release/17-1/command_reference/b_171_9600_cr/interface_and_hardware_commands.html
- RFC 2644, "Changing the Default for Directed Broadcasts in Routers": https://datatracker.ietf.org/doc/rfc2644/

## Issues Found
- The original verification method relied on `show running-config ... | include directed-broadcast` and treated empty output as disabled. That is not reliable on older pre-12.0 IOS, where directed broadcast was enabled by default and default settings may not appear in the running config. I changed the check and verification examples to `show ip interface ...`, which shows the actual operational state as `Directed broadcast forwarding is enabled` or `disabled`.
- The "Applying Globally with a Script" section implied there was an IOS-wide global disable path and included a Tcl snippet that was not a documented or dependable way to do this. Cisco documents `ip directed-broadcast` as an interface-configuration command, so I replaced that section with an accurate note that the setting is per-interface and should be pushed with automation tooling.
- The Wake-on-LAN example used a named ACL with destination `255.255.255.255`, then applied it with `ip directed-broadcast DIRECTED-BCAST-ACL`. Cisco's documented IOS syntax for this command uses an access-list number, and the ACL needs to match the target subnet's directed-broadcast traffic rather than the limited broadcast address. I changed the example to a numbered extended ACL permitting UDP/9 to a concrete directed-broadcast address and applied it with `ip directed-broadcast 101`.
- The anti-smurf ACL example denied ICMP echo to `192.168.0.0/16`, which is a whole address block, not broadcast addresses. I corrected the example to match explicit directed-broadcast host addresses and clarified that defense-in-depth filtering should target each local subnet's directed-broadcast address.

## Review Notes
- On some newer IOS XE platforms, intentionally receiving network-prefix-directed broadcasts can also involve the ingress-side `ip network-broadcast` command in addition to egress `ip directed-broadcast`. The post is now accurate for the disable workflow and for generic interface-level enablement, but platform-specific enablement details may vary.
