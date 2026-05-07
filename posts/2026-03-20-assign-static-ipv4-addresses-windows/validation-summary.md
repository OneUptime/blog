# Validation Summary: How to Assign Static IPv4 Addresses on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Windows networking
- Windows PowerShell
- `New-NetIPAddress`
- `Remove-NetIPAddress`
- `Set-NetIPInterface`
- `Set-DnsClientServerAddress`
- `netsh`
- `ipconfig`
- `Test-NetConnection`
- IPv4
- DHCP

## Sources Consulted
- Microsoft Learn: `New-NetIPAddress` https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `Remove-NetIPAddress` https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `Set-NetIPInterface` https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: `Set-DnsClientServerAddress` https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetAdapter` https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2022-ps
- Microsoft Learn: `Test-NetConnection` https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps
- Microsoft Learn: `netsh interface` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `ipconfig` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Support: Essential Network Settings and Tasks in Windows https://support.microsoft.com/en-gb/windows/essential-network-settings-and-tasks-in-windows-f21a9bbc-c582-55cd-35e0-73431160a1b9
- Google Public DNS documentation https://developers.google.com/speed/public-dns/docs/using
- Cloudflare 1.1.1.1 IP address documentation https://developers.cloudflare.com/1.1.1.1/ip-addresses/

## Issues Found
- The PowerShell example removed all matching IP addresses and routes on the interface before assigning a new address. Microsoft documents that `New-NetIPAddress` disables DHCP automatically on a DHCP-enabled interface, and the original `Remove-NetRoute` usage was too broad. I removed those lines from the main setup example and scoped verification to IPv4.
- The `Get-NetAdapter` note referred to an `InterfaceIndex` column, but the default table view exposes the adapter index as `ifIndex`. I corrected the note to match the command output.
- The `netsh` DNS commands used `set dns` and `add dns` under the `interface ipv4` context. Current Microsoft documentation for the `ipv4` context uses `set dnsservers` and `add dnsservers`, so I updated those commands and the DHCP revert example accordingly.
- The PowerShell DHCP revert example only enabled DHCP and reset DNS. Because static IPv4 addresses are separate address objects, I updated the example to enable DHCP only for IPv4 and remove only manually configured IPv4 addresses.
- The connectivity check targeted `8.8.8.8` on TCP port `80`, which is not an appropriate example for a public DNS resolver. I changed it to a plain reachability test with `Test-NetConnection -ComputerName 8.8.8.8`.
- The claim that `netsh` works on "XP through Windows 11" was broader than the current Microsoft documentation supports. I replaced it with a narrower, documented statement that `netsh` remains available on current Windows versions, while Microsoft recommends PowerShell for new automation.
- The metadata tag `Window` was incorrect for the platform discussed. I corrected it to `Windows`.

## Review Notes
- The GUI walkthrough is technically valid, but current Microsoft end-user guidance for Windows 10 and Windows 11 emphasizes the Settings app path as the primary interface for changing IP assignment.
- The examples use public DNS resolver addresses for demonstration. In production, readers should use DNS servers appropriate for their network policy.
