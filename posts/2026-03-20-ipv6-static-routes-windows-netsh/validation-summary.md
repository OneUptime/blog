# Validation Summary: How to Add IPv6 Static Routes on Windows with netsh

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- IPv6 routing
- `netsh`
- PowerShell `NetTCPIP` cmdlets
- PowerShell `NetAdapter` cmdlets

## Sources Consulted
- Microsoft Learn: `netsh interface` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `New-NetRoute` cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetRoute` cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Remove-NetRoute` cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Find-NetRoute` cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/find-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetAdapter` cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `route` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008

## Issues Found
- The post stated that `PersistentStore` is the default for `New-NetRoute`. Microsoft documents that `PersistentStore` cannot be passed to `-PolicyStore`; by default, `New-NetRoute` saves routes in both `ActiveStore` and `PersistentStore`. I corrected the overview, persistence note, and summary to reflect that behavior.
- The tag `Window` was inaccurate for the platform name. I corrected it to `Windows`.

## Review Notes
`netsh` is still documented for current Windows releases, so the article is not relying on a deprecated command path. For troubleshooting store-specific behavior, `Get-NetRoute -PolicyStore ActiveStore` and `Get-NetRoute -PolicyStore PersistentStore` are clearer than `route print`.
