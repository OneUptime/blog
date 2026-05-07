# Validation Summary: How to Add a Persistent Static Route on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows routing table management
- `route.exe`
- PowerShell `NetTCPIP` cmdlets
- PowerShell `Get-NetAdapter`
- ICMP troubleshooting with `ping` and `tracert`

## Sources Consulted
- Microsoft Learn: `route` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008
- Microsoft Learn: `New-NetRoute` cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Remove-NetRoute` cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetAdapter` cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `ping` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Microsoft Learn: `tracert` command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
- Microsoft Learn: Additional default gateways may appear in persistent routes when you use LBFO: https://learn.microsoft.com/en-us/troubleshoot/windows-client/networking/incorrect-default-gateways-in-persistent-routes

## Issues Found
- The post used `-p` after `route add`, but Microsoft documents persistence as the `/p` option placed before the command, such as `route /p add ...`. I updated all persistent `route` examples and the related description/conclusion text to match the documented syntax.
- The introduction and conclusion implied that persistence behavior for `route` and `New-NetRoute` was the same. Microsoft documents that `New-NetRoute` saves routes in both `ActiveStore` and `PersistentStore` by default. I updated the wording and the PowerShell comment to reflect that behavior accurately.
- The verification section said `ping` was "using the static route." `ping` verifies reachability, but `tracert` is the more direct way to inspect path selection. I changed the `ping` comment to "Ping the destination" to avoid overstating what the command proves.

## Review Notes
PowerShell route cmdlets distinguish between `ActiveStore` and `PersistentStore`. If a future revision wants to show a temporary PowerShell route explicitly, `New-NetRoute -PolicyStore ActiveStore` would be the relevant documented pattern.
