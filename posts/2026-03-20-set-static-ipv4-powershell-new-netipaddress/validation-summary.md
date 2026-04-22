# Validation Summary: How to Set a Static IPv4 Address Using PowerShell New-NetIPAddress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Windows PowerShell
- NetTCPIP PowerShell module
- DnsClient PowerShell module
- Windows network adapters
- IPv4 static addressing, prefix length, default gateway, and DNS server configuration

## Sources Consulted
- Microsoft Learn: New-NetIPAddress (NetTCPIP) - https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: Remove-NetIPAddress (NetTCPIP) - https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: Remove-NetRoute (NetTCPIP) - https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute?view=windowsserver2025-ps
- Microsoft Learn: Set-NetIPInterface (NetTCPIP) - https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: Get-NetIPAddress (NetTCPIP) - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: Get-NetRoute (NetTCPIP) - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute?view=windowsserver2025-ps
- Microsoft Learn: Get-NetAdapter (NetAdapter) - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn: Set-DnsClientServerAddress (DnsClient) - https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: Get-DnsClientServerAddress (DnsClient) - https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress?view=windowsserver2025-ps

## Issues Found
- The `Remove-NetRoute` examples claimed to remove the existing default route, but `Remove-NetRoute -InterfaceIndex ... -AddressFamily IPv4` can match all IPv4 routes on the interface. Updated the commands to include `-DestinationPrefix "0.0.0.0/0"` so they target the IPv4 default route.
- The DHCP disabling examples were in an IPv4-focused tutorial but did not scope `Set-NetIPInterface` to IPv4. Added `-AddressFamily IPv4` to make the commands match the article's IPv4 scope.
- Corrected the technology tag from `Window` to `Windows`.

## Review Notes
Microsoft's `New-NetIPAddress` documentation states that adding an IP address to a DHCP-enabled interface automatically disables DHCP on that interface. The explicit `Set-NetIPInterface -Dhcp Disabled` command remains valid for clarity in a complete static IPv4 configuration script.
