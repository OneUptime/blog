# Validation Summary: How to Fix 'DHCP Is Not Enabled for WiFi' Error

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- DHCP
- Wi-Fi adapter configuration
- PowerShell networking cmdlets
- `ipconfig`
- `netsh`
- `gpresult`

## Sources Consulted
- Microsoft Support: Essential Network Settings and Tasks in Windows - https://support.microsoft.com/en-gb/windows/change-tcp-ip-settings-bd0a07af-15f5-cd6a-363f-ca2b6f391ace
- Microsoft Learn: Set-NetIPInterface - https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: Set-DnsClientServerAddress - https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: Enable-NetAdapter - https://learn.microsoft.com/en-us/powershell/module/netadapter/enable-netadapter?view=windowsserver2025-ps
- Microsoft Learn: Disable-NetAdapter - https://learn.microsoft.com/en-us/powershell/module/netadapter/disable-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `ipconfig` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `netsh interface` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `gpresult` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/gpresult
- Microsoft Learn: `findstr` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- Microsoft Support: Fix Wi-Fi connection issues in Windows - https://support.microsoft.com/en-us/windows/fix-wi-fi-connection-issues-in-windows-9424a1f7-6a3b-65a6-4d78-7f07eee84d2c

## Issues Found
- The post stated the error was caused by a static IP configuration as an absolute rule. I changed the wording to say this is the usual cause and clarified that the adapter is not set to automatic IP assignment, which is a more accurate description of what the troubleshooter is flagging.
- The Settings steps did not match Microsoft's current documented path for editing Wi-Fi IP assignment. I updated them to use `WiFi > Manage known networks > [network] > IP assignment > Edit`.
- The PowerShell example enabled DHCP without scoping to IPv4 and renewed all adapters. I updated it to target IPv4 explicitly with `-AddressFamily IPv4` and to release and renew the `Wi-Fi` adapter specifically.
- The `netsh` commands used older `interface ip` syntax and omitted the documented `source=dhcp` form. I corrected them to `netsh interface ipv4 set address ... source=dhcp`, `netsh interface ipv4 set dnsservers ... source=dhcp`, and `netsh interface ipv4 show config`.
- The Group Policy example used `findstr` with an incorrect pattern style and implied it could directly confirm an IP policy. I replaced it with `gpresult /h gp-report.html`, which is a documented way to review applied Group Policy results.
- The conclusion repeated the original overstatement about the root cause. I updated it to match the corrected explanation and command syntax.

## Review Notes
The command examples assume the network adapter alias is `Wi-Fi`. On localized systems or machines where the adapter has been renamed, readers may need to substitute the actual interface name shown by Windows.
