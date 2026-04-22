# Validation Summary: How to Configure SLAAC on Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 SLAAC
- Windows IPv6 networking
- Router Advertisements and Router Discovery
- Windows netsh
- Windows PowerShell NetTCPIP and NetAdapter cmdlets
- IPv6 privacy extensions and temporary addresses
- pktmon packet capture

## Sources Consulted
- Microsoft Learn: Get-NetIPAddress - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress
- Microsoft Learn: Get-NetIPInterface / Set-NetIPInterface - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface and https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface
- Microsoft Learn: Get-NetIPv6Protocol / Set-NetIPv6Protocol - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipv6protocol and https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipv6protocol
- Microsoft Learn: Get-NetRoute - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute
- Microsoft Learn: NetAdapter cmdlets - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterbinding and https://learn.microsoft.com/en-us/powershell/module/netadapter/enable-netadapterbinding
- Microsoft Learn: netsh interface commands - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: pktmon filter add - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pktmon-filter-add
- Microsoft Learn: Configure IPv6 in Windows for advanced users - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn: Set-ItemProperty - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-itemproperty
- RFC 4861: Neighbor Discovery for IPv6 - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- RFC 8981: Temporary Address Extensions for SLAAC - https://www.rfc-editor.org/rfc/rfc8981

## Issues Found
- Clarified that `SuffixOrigin: Random` indicates a temporary or randomized identifier, not only privacy extensions, and that `ValidLifetime` depends on the RA-advertised prefix lifetime.
- Changed the Router Discovery refresh example to disable and then re-enable Router Discovery, because setting an already-enabled interface to enabled is not a reliable refresh.
- Updated `netsh interface ipv6 show routes` to the current documented `show route` form.
- Corrected the privacy settings sample output and default DAD attempts, and separated temporary privacy addresses from randomized interface identifiers.
- Corrected the static-address explanation: adding a manual IPv6 address does not disable Router Discovery/SLAAC by itself.
- Replaced the invalid `Get-NetRoute` filter for `Protocol -eq "RouterAdvertisement"`; Microsoft documents no `RouterAdvertisement` value for the route protocol enum.
- Corrected the pktmon filter command from `pktmon filter add -p icmpv6` to `pktmon filter add -t ICMPv6`, matching the documented transport-protocol flag.
- Clarified the `DisabledComponents` explanation because Windows cannot completely disable IPv6 internal/loopback use.

## Review Notes
Configuration commands require an elevated PowerShell or Command Prompt session. Some output details vary by Windows release and network RA settings, especially temporary address lifetimes and route protocol display. Windows-specific commands were not executed in this Linux workspace; they were validated against Microsoft documentation and relevant RFCs.
