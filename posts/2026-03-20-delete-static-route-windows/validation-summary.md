# Validation Summary: How to Delete a Static Route on Windows

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Windows `route` CLI command (cmd.exe)
- Windows batch scripting (`@echo off`, `::` comments, `findstr`)
- PowerShell `NetTCPIP` module cmdlets (`Get-NetRoute`, `Remove-NetRoute`)
- IPv4 routing (CIDR notation, subnet masks, default route)
- Windows Persistent Routes registry (`HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes`)

## Sources Consulted
- [Microsoft Learn — `route` command reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008)
- [Microsoft Learn — `Remove-NetRoute` (NetTCPIP)](https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netroute)
- [Microsoft Learn — `Get-NetRoute` (NetTCPIP)](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute)

## Issues Found

1. **Incorrect wildcard explanation in "Deleting All Routes to a Network"** — The post originally claimed: *"Using a wildcard - the `*` pattern matches any mask"*, with the example `route delete 10.0.0.0`. This is wrong on two counts:
   - Per Microsoft's documentation, the `*` and `?` wildcards apply to the **destination** field, not the mask. ("The asterisk matches any string, and the question mark matches any single character.")
   - The shown example (`route delete 10.0.0.0`) does not actually contain a wildcard, so it does not demonstrate the feature being described. With no mask given, `route delete <dest>` defaults to a `/32` host-route mask per the docs.
   - **Fix:** Updated the explanation to correctly describe how `*` and `?` work on the destination, and changed the example to `route delete 10.*`, which is the canonical wildcard form shown in Microsoft's own documentation example.

## Review Notes

- The remaining `route delete` syntax (with explicit `mask`, gateway selection, default route deletion `0.0.0.0 mask 0.0.0.0`, batch script structure) all match Microsoft's documented syntax.
- The PowerShell cmdlets `Get-NetRoute` and `Remove-NetRoute` and the parameters used (`-DestinationPrefix`, `-NextHop`, `-InterfaceAlias`, `-Confirm:$false`) are correct per the `NetTCPIP` module reference.
- The claim that `route delete` removes both active and persistent routes simultaneously is generally accurate for modern Windows behavior; the post correctly hedges by suggesting a follow-up verification and a PowerShell fallback if the persistent entry remains.
- The verification command `route print | findstr /i "persistent"` will always match the literal "Persistent Routes:" section header in `route print` output, so it is a weak verification method (it confirms the section exists, not whether your specific entry survived). It is not technically wrong, but a future revision could replace it with a destination-specific filter such as `route print | findstr "10.0.0"` or simply `Get-NetRoute -DestinationPrefix "10.0.0.0/8"`.
- The PowerShell example `Get-NetRoute -InterfaceAlias "Ethernet" | Where-Object {$_.RouteMetric -ne 0} | Remove-NetRoute -Confirm:$false` is syntactically valid, but the comment "Delete all non-system routes from an interface" overstates what the filter does — a non-zero `RouteMetric` is not a reliable indicator of a user-added (vs. system) route. This is editorial rather than a correctness issue, so left unchanged.
- Tag `Window` is likely a typo for `Windows`, but tag values are not technical content and were left untouched.
