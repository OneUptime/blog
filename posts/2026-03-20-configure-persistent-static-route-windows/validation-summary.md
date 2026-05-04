# Validation Summary: How to Configure a Persistent Static Route on Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Windows networking (IPv4 routing)
- `route` command (cmd.exe)
- PowerShell `NetTCPIP` module (`New-NetRoute`, `Get-NetRoute`, `Remove-NetRoute`)
- Windows Registry (PersistentRoutes key)

## Sources Consulted
- Microsoft Docs: route command reference (https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008)
- Microsoft Docs: New-NetRoute cmdlet (https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute)
- Microsoft Docs: Get-NetRoute cmdlet (https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute)
- Microsoft Docs: Remove-NetRoute cmdlet (https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute)
- Microsoft KB: Persistent routes registry location under `HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes`

## Issues Found
No technical issues found.

Verified items:
- `route add -p` correctly creates a persistent IPv4 route stored in the Windows registry.
- The command syntax `route add -p <destination> mask <netmask> <gateway> [metric <n>]` is valid.
- `route print -4` correctly filters the routing table to IPv4 entries and includes a "Persistent Routes" section.
- `route delete <destination> mask <netmask>` removes entries from both the active and persistent routing tables, matching Microsoft's documented behavior.
- `New-NetRoute` writes to the PersistentStore by default, so routes created this way survive reboots without an extra flag.
- The cmdlet parameters used (`-InterfaceAlias`, `-DestinationPrefix`, `-NextHop`, `-RouteMetric`) are all valid for `New-NetRoute`.
- `Remove-NetRoute -DestinationPrefix "10.0.0.0/8" -Confirm:$false` is the correct way to remove a route non-interactively.
- The registry path `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes` is the documented storage location for legacy `route -p` persistent routes.

## Review Notes
- The `route` command requires an elevated (Administrator) command prompt. The post does not explicitly mention this; readers running the commands in a non-elevated shell will see "The requested operation requires elevation" or a silent failure.
- Routes added with `New-NetRoute` (which writes to the PersistentStore) are not visible in the legacy `route print` "Persistent Routes" section in the same way as `route add -p` entries — they are managed via the modern NRPT/IP Helper APIs. This distinction is not called out but is generally not problematic for end users.
- The example output in the "Confirming Persistence" section shows a metric of `1` even though the previous example added the route without specifying a metric. The actual default metric depends on the interface metric and is typically auto-calculated; this is a minor cosmetic detail in an illustrative comment, not an error.
- The tag list contains "Window" (singular) which is likely a typo for "Windows", but tag content is outside the technical-accuracy review scope.
