# Validation Summary: How to Add a Static Route on Windows Using route add

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- Windows `route` command
- PowerShell NetTCPIP cmdlets (`New-NetRoute`, `Find-NetRoute`)
- IPv4 routing

## Sources Consulted
- Microsoft Learn: `route` command documentation
  https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/route_ws2008
- Microsoft Learn: `New-NetRoute` cmdlet documentation
  https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netroute?view=windowsserver2025-ps
- Microsoft Learn: `Find-NetRoute` cmdlet documentation
  https://learn.microsoft.com/en-us/powershell/module/nettcpip/find-netroute?view=windowsserver2025-ps
- Microsoft Learn: Automatic Metric for IPv4 routes
  https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/automatic-metric-for-ipv4-routes

## Issues Found
- The metric example incorrectly said `metric 10` would be preferred over a metric of `1`. I removed that claim because Microsoft documents that lower metrics are preferred, so `1` would beat `10`.
- The simplified syntax block said the default metric is `1`. I changed that to `1-9999` because the official `route` documentation defines the valid metric range but does not document a default of `1`, and Windows can also apply automatic metric behavior.

## Review Notes
- The post is focused on IPv4 and the command usage is consistent with current Microsoft documentation for Windows 10, Windows 11, and supported Windows Server releases.
- The PowerShell example is technically correct: `New-NetRoute` saves routes in both the active and persistent stores by default unless `-PolicyStore ActiveStore` is used.
