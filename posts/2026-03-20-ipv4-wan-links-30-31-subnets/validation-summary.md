# Validation Summary: How to Plan IPv4 Addressing for WAN Links Using /30 or /31

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting for point-to-point WAN links
- RFC 3021 `/31` addressing
- Cisco IOS / IOS XE interface and verification commands
- Python `ipaddress`

## Sources Consulted
- RFC 3021, *Using 31-Bit Prefixes on IPv4 Point-to-Point Links*: https://www.rfc-editor.org/rfc/rfc3021
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Cisco IOS XE 17.x IP Addressing Configuration Guide, *Configuring IPv4 Addresses*: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_config-ipv4-addr-0.html
- Cisco, *Configure IP Addresses and Unique Subnets for New Users*: https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html
- Cisco command reference, `show ip route`: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/show_ip_route.htm
- Cisco command reference, `show interfaces`: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/show_interfaces.htm
- Cisco IOS Configuration Fundamentals Command Reference, `ping`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/command/Cisco_IOS_Configuration_Fundamentals_Command_Reference/monitor_event-trace_through_Q.html

## Issues Found
- The `/31` overview said there was "No broadcast address!" RFC 3021 is narrower than that: the two addresses in the `/31` are treated as host addresses and there is no subnet-directed broadcast for that prefix. The wording was corrected to "No subnet broadcast address!".
- The `/31` configuration note suggested checking `ip unnumbered` to determine support. `ip unnumbered` is a separate address-conservation feature, not a support check for `/31`, so the note was changed to direct readers to vendor documentation and release notes for RFC 3021 support.
- The Python allocator described `/31` handling as using the network and broadcast addresses and implemented that via `network_address` and `broadcast_address`. Python's `ipaddress` documentation explicitly says `hosts()` includes both usable addresses for `/31`, so the example was updated to use `hosts()` directly.
- The final verification block was hard-coded to the `/30` sample values even though the post also teaches `/31`. It was changed to generic Cisco IOS CLI placeholders so the commands apply to either addressing choice, and the code fence was relabeled from `bash` to `text` because these are IOS CLI commands, not shell commands.

## Review Notes
- Cisco's current IPv4 addressing guide documents `/31` support for point-to-point WAN addressing, but support still varies by platform and software release on older equipment.
- The Python example is correct after the fix, though it eagerly builds all child subnets with `list(parent.subnets(...))`; that is fine for the `/16` examples shown here.
