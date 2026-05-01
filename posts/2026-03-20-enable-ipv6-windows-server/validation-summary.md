# Validation Summary: How to Enable IPv6 on Windows Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Server networking
- IPv6
- PowerShell (`NetAdapter`, `NetTCPIP`, `DnsClient`)
- `netsh`

## Sources Consulted
- Microsoft Learn: Configure IPv6 for advanced users - Windows Server - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn: `netsh interface` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `Enable-NetAdapterBinding` - https://learn.microsoft.com/en-us/powershell/module/netadapter/enable-netadapterbinding?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetAdapterBinding` - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterbinding?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `New-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `Set-DnsClientServerAddress` - https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: `Test-NetConnection` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetRoute` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute?view=windowsserver2025-ps

## Issues Found
- The post said `netsh interface ipv6 install` could enable IPv6 on a specific interface. Current Windows Server `netsh interface ipv6` documentation does not list that command, and it did not match the post's claimed per-interface behavior. I corrected the section so `netsh` is used for inspection, while PowerShell or the GUI is used to enable the IPv6 binding.
- The `DisabledComponents` explanation treated any non-zero value as partial or full IPv6 disablement and described `0xFF` as "all IPv6 disabled." Microsoft documents this setting as a bitmask where `0x20` only prefers IPv4 over IPv6, and IPv6 is still used internally even when `0xFF` is set. I updated the comments to reflect that behavior accurately.
- The PowerShell example comment said "all adapters" for `Enable-NetAdapterBinding -Name "*"`. Microsoft documents this pattern against visible adapters in the normal adapter-properties view, so I narrowed the wording to "all visible adapters."

## Review Notes
- Microsoft recommends not disabling or unbinding IPv6 unless there is a specific need, because some Windows components expect IPv6 to remain available.
- Microsoft notes that `DisabledComponents` values other than `0` or `32` can cause the Routing and Remote Access service to fail after restart.
