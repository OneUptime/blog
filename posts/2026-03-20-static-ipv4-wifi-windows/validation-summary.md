# Validation Summary: How to Configure a Static IPv4 Address for WiFi on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Windows 10/11 network settings
- IPv4 static addressing and DHCP
- Windows PowerShell NetTCPIP and DnsClient cmdlets
- netsh interface IP configuration
- Windows command-line network diagnostics
- Google Public DNS

## Sources Consulted
- Microsoft Support: Essential Network Settings and Tasks in Windows - https://support.microsoft.com/en-us/windows/essential-network-settings-and-tasks-in-windows-f21a9bbc-c582-55cd-35e0-73431160a1b9
- Microsoft Learn: New-NetIPAddress - https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress
- Microsoft Learn: Remove-NetIPAddress - https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress
- Microsoft Learn: Remove-NetRoute - https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute
- Microsoft Learn: Set-NetIPInterface - https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface
- Microsoft Learn: Set-DnsClientServerAddress - https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress
- Microsoft Learn: Get-NetAdapter - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter
- Microsoft Learn: netsh interface - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: netsh - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh
- Microsoft Learn: ipconfig - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: arp - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/arp
- Microsoft Learn: ping - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Microsoft Learn: nslookup - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- Google Public DNS documentation - https://developers.google.com/speed/public-dns/docs/using

## Issues Found
- The GUI example used only "Subnet prefix length: 24". Microsoft Support's current IPv4 instructions use "Subnet mask", while some Windows dialogs use prefix length. Updated the entry to show `255.255.255.0` and note that `24` should be used if the dialog asks for prefix length.
- The `arp -a` comment implied it can show all IPs in use. Microsoft documents `arp -a` as showing ARP cache entries, which are not a complete network scan. Updated the comment to describe it as recently resolved IP/MAC entries and not a complete conflict check.
- The PowerShell cleanup commands were not scoped to IPv4. `Remove-NetIPAddress`, `Remove-NetRoute`, and `Set-NetIPInterface` support `-AddressFamily`; because this guide is specifically for IPv4, added `-AddressFamily IPv4` to avoid unintentionally changing IPv6 interface state or addresses.
- The PowerShell DHCP revert example enabled DHCP without first removing the static IPv4 address and default route. Added scoped removal commands before enabling IPv4 DHCP so the revert sequence reliably returns the interface to DHCP addressing.
- The conclusion referenced `Set-NetIPInterface -Dhcp Enabled` without IPv4 scoping. Updated it to match the corrected command.

## Review Notes
The netsh examples are still valid, and Microsoft documentation recommends PowerShell for Windows networking management over netsh. The sample Google DNS addresses `8.8.8.8` and `8.8.4.4` match Google Public DNS documentation. Users should still confirm their router's DHCP pool and any DHCP reservations before choosing a static address.
