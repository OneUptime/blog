# Validation Summary: How to Enable DHCP on a Network Adapter Using PowerShell

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Windows networking
- PowerShell
- NetTCPIP PowerShell module
- DnsClient PowerShell module
- NetAdapter PowerShell module
- `ipconfig`
- `netsh`

## Sources Consulted
- Microsoft Learn: `Get-NetAdapter` (NetAdapter) https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetIPAddress` (NetTCPIP) https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `Remove-NetIPAddress` (NetTCPIP) https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetIPInterface` (NetTCPIP) https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: `Set-NetIPInterface` (NetTCPIP) https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: `Set-DnsClientServerAddress` (DnsClient) https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: `Disable-NetAdapter` (NetAdapter) https://learn.microsoft.com/en-us/powershell/module/netadapter/disable-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `Enable-NetAdapter` (NetAdapter) https://learn.microsoft.com/en-us/powershell/module/netadapter/enable-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `ipconfig` command reference https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `netsh interface` command reference https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface

## Issues Found
- The post tag said `Window` instead of `Windows`. I corrected the platform name in the metadata.
- The DHCP-enablement command used `Set-NetIPInterface` without `-AddressFamily IPv4`. I added the address-family filter because the official cmdlet operates on IP interfaces, and the adapter index/alias otherwise also matches the IPv6 interface.
- The static-address removal step removed every IPv4 address on the interface. I narrowed it to `-PrefixOrigin Manual`, which matches manually configured IPv4 addresses per the official `Remove-NetIPAddress` documentation.
- The route-removal step claimed to remove static routes, but `Get-NetRoute -InterfaceIndex ... -AddressFamily IPv4 | Remove-NetRoute` would remove all IPv4 routes on that interface. I removed that step because `Remove-NetIPAddress` already removes the IP address and its configuration, and the original route deletion was broader than described.
- The verification command used `Get-NetIPInterface` without `-AddressFamily IPv4`, which could return both IPv4 and IPv6 interface rows. I scoped it to IPv4 so the output matches the article's intent.
- The `netsh` DNS example used `set dns`, which is not the current documented `netsh interface ipv4` syntax. I corrected it to `set dnsservers`.
- The conclusion referenced `Set-NetIPInterface -Dhcp Enabled` generically. I updated it to the IPv4-scoped form used in the corrected example.

## Review Notes
- The commands were validated against current Microsoft Learn documentation and syntax references. They were not executed in this workspace because the review environment is not a Windows host.
- The cmdlets and command references checked are current in Microsoft Learn and apply to supported modern Windows releases including Windows 10, Windows 11, and current Windows Server versions.
- `Disable-NetAdapter` temporarily drops connectivity on the target adapter. Microsoft documents that this should not be used on the adapter currently managing a remote session.
