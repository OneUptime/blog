# Validation Summary: How to Add a Static Route on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Windows IPv4 routing
- `route` command on Windows
- PowerShell `NetTCPIP` cmdlets (`New-NetRoute`, `Set-NetRoute`, `Remove-NetRoute`)
- Windows network troubleshooting commands (`tracert`, `findstr`)

## Sources Consulted
- Microsoft Learn: `route` command https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008
- Microsoft Learn: `New-NetRoute` https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Set-NetRoute` https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Remove-NetRoute` https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute?view=windowsserver2025-ps
- Microsoft Learn: `tracert` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
- Microsoft Learn: `findstr` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr

## Issues Found
- The documented `route add` syntax was inaccurate. I corrected it to include the literal `mask` keyword and the `NETMASK` placeholder so it matches Microsoft’s documented syntax.
- The post used `-p` for persistent routes, but Microsoft documents the persistent switch as `/p` and shows it as `route /p add ...`. I updated the explanation, examples, batch script, and key takeaways accordingly.
- The `cmd` snippets used `#` comment lines, which are not valid Command Prompt comments. I replaced them with `REM` so the examples are copy-paste safe in `cmd`/batch contexts.
- The first `New-NetRoute` example was missing the mandatory interface selector. I added `-InterfaceAlias "Ethernet"` and used `-PolicyStore ActiveStore` so the “temporary route” example now behaves as described.
- The post said PowerShell routes are persistent by default without explaining the actual behavior. I corrected this to reflect that `New-NetRoute` saves routes in both `ActiveStore` and `PersistentStore` by default.
- The `Remove-NetRoute` note implied a bare `Remove-NetRoute` was the cleanup command. Microsoft documents that running it without parameters removes all IP routes, including default routes, so I replaced it with a scoped removal example.
- The verification section claimed there is no Windows equivalent to `ip route get`. I removed that claim and kept the `tracert` example focused on path inspection instead.
- The PowerShell bulk-route script also omitted the required interface parameter. I added an `$interfaceAlias` variable and used it in each `New-NetRoute` call.

## Review Notes
None.
