# Validation Summary: How to View the IPv6 Routing Table on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking commands
- IPv6 routing
- `route`
- `netsh`
- PowerShell `NetTCPIP` cmdlets
- PowerShell `NetAdapter` cmdlets

## Sources Consulted
- Microsoft Learn: `route` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008
- Microsoft Learn: `netsh interface` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `Get-NetRoute` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute?view=windowsserver2022-ps
- Microsoft Learn: `Get-NetIPConfiguration` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipconfiguration?view=windowsserver2025-ps
- Microsoft Learn: `Test-NetConnection` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2022-ps
- Microsoft Learn: `Find-NetRoute` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/find-netroute?view=windowsserver2025-ps
- Microsoft Learn: `MSFT_NetRoute` class - https://learn.microsoft.com/en-us/windows/win32/fwp/wmi/nettcpipprov/msft-netroute
- Microsoft Learn: `Get-NetAdapter` - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2022-ps

## Issues Found
- `netsh interface ipv6 show route interface="Ethernet"` was not valid syntax. The documented `show route` form supports `level` and `store`, not interface filtering, so it was replaced with `netsh interface ipv6 show route store=persistent`.
- `netsh interface ipv6 show route verbose=enabled` used the wrong parameter form. Microsoft documents this as `level=verbose`, so the command was corrected.
- The `findstr` example was described as finding the "best route," but it only searches displayed text. The wording was corrected to describe it as a prefix search.
- `Get-NetRoute | Where-Object Protocol -eq "RouterDiscovery"` used an unsupported protocol value. Microsoft documents route protocol values such as `Icmp`, `Local`, and `NetMgmt`, so the example and explanation were corrected to use `-Protocol Icmp`.
- The `Protocol` field explanation referenced `RouterDiscovery`, which is not one of the documented `MSFT_NetRoute` protocol values. The explanation was updated to use documented values.
- `Join-Object` is not a built-in Windows PowerShell cmdlet and was presented without any module requirement. The example was replaced with a built-in `Select-Object` view that uses `Get-NetRoute`'s existing `InterfaceAlias` property.

## Review Notes
- No remaining technical issues were found after the corrections above.
- If the post later wants a true "best route to a destination" example, `Find-NetRoute -RemoteIPAddress ...` is a better documented PowerShell option than text-filtering `netsh` output.
