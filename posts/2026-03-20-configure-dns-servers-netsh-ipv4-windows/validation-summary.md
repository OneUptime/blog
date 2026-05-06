# Validation Summary: How to Configure DNS Servers with netsh interface ipv4 on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- `netsh`
- IPv4
- DNS client configuration
- PowerShell `DnsClient` cmdlets
- `ipconfig`
- `nslookup`

## Sources Consulted
- Microsoft Learn, `netsh interface`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, `netsh`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh
- Microsoft Learn, `Set-DnsClientServerAddress`: https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn, `ipconfig`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn, `nslookup`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup

## Issues Found
- The post used undocumented or outdated `netsh interface ipv4` command forms such as `set dns`, `add dns`, and `show dns`. Microsoft’s current `netsh interface ipv4` reference documents `set dnsservers`, `add dnsservers`, and `show dnsservers`, so I updated each example to the documented command names.
- The “show all adapter DNS config” example used `netsh interface ipv4 show dns`, which is not a documented `ipv4 show` command. I changed it to `netsh interface ipv4 show config`, which Microsoft documents for viewing TCP/IP configuration including DNS settings.
- The tags listed `Window` instead of `Windows`. I corrected the platform name to match Microsoft’s product name.

## Review Notes
- `netsh` remains officially documented for current Windows releases, but PowerShell `Set-DnsClientServerAddress` is also an official and often cleaner option, especially when setting multiple DNS servers at once.
- The post is intentionally IPv4-specific. IPv6 DNS configuration uses the separate `netsh interface ipv6` command set.
