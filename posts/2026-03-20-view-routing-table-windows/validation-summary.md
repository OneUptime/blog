# Validation Summary: How to View the Routing Table on Windows

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Windows `route` command (route print, -4, -6)
- PowerShell NetTCPIP module cmdlets (Get-NetRoute, Find-NetRoute)
- Windows command-line utilities (findstr, Export-Csv)
- IPv4 routing concepts (default route, loopback, multicast, broadcast)

## Sources Consulted
- Microsoft Learn: route command reference — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008
- Microsoft Learn: Get-NetRoute — https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute
- Microsoft Learn: Find-NetRoute — https://learn.microsoft.com/en-us/powershell/module/nettcpip/find-netroute
- Microsoft Learn: findstr command reference — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- RFC 1122 (127.0.0.0/8 loopback), RFC 5771 (224.0.0.0/4 multicast), RFC 919 (255.255.255.255 limited broadcast)

## Issues Found
- **Misleading comment on `route print | findstr "0.0.0.0"`**: The original comment read "Shows which route will be used (like tracert dry-run)". This is inaccurate — `findstr` only filters output lines by string match; it performs no route lookup. The description actually fits `Find-NetRoute` shown on the next line. I rewrote the comment to describe the filtering behavior correctly and clarified that `Find-NetRoute` is what performs route resolution.

## Review Notes
- The `route print` sample output is consistent with what Windows produces: the per-host `/32` for the adapter's own IP and the `.255` directed broadcast entry are both real Windows quirks and correctly shown.
- Metric values (25 for default, 281/331 for on-link) are typical Windows-assigned values and reasonable as example output.
- The PowerShell sample output shows `NextHop` of `0.0.0.0` for On-link routes, which matches the actual `Get-NetRoute` output format.
- The `-AddressFamily IPv4` parameter and `-DestinationPrefix`/`-InterfaceAlias` filters on `Get-NetRoute` are current and non-deprecated as of Windows 10/11 and Windows Server 2016+.
- Minor spelling note (not fixed, as only technical errors are in scope): the tag list contains "Window" rather than "Windows".
