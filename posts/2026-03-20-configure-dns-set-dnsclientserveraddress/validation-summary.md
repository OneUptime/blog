# Validation Summary: How to Configure DNS Servers Using Set-DnsClientServerAddress in PowerShell

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows DNS client configuration
- PowerShell `DnsClient` module
- PowerShell `NetAdapter` module
- Windows `netsh` networking CLI
- Windows `ipconfig`

## Sources Consulted
- Microsoft Learn: `Set-DnsClientServerAddress` — https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: `Get-DnsClientServerAddress` — https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: `Resolve-DnsName` — https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps
- Microsoft Learn: `Clear-DnsClientCache` — https://learn.microsoft.com/en-us/powershell/module/dnsclient/clear-dnsclientcache?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetAdapter` — https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn: `netsh interface` — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `ipconfig` — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: Best practices for DNS client settings in Windows Server — https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/best-practices-for-dns-client-settings

## Issues Found
- The introduction said `Set-DnsClientServerAddress` replaced `netsh` with a "scriptable interface," which was misleading because `netsh` is also scriptable. I changed this to describe the cmdlet as a cleaner, PowerShell-native and more modern alternative.
- The `ipconfig /all | Select-String "DNS Servers"` verification example could omit secondary and later DNS server entries because continued `ipconfig` lines do not repeat the `DNS Servers` label. I changed it to `ipconfig /all`.
- The `netsh` examples used `set dns` and `add dns`, but Microsoft documents the IPv4 commands as `set dnsservers` and `add dnsservers`. I corrected both commands to the documented syntax.
- The provisioning example mixed internal Active Directory-style DNS servers with `8.8.8.8` as an external fallback. Microsoft recommends domain-joined and AD-dependent systems use internal DNS servers and rely on forwarders for external resolution. I removed the public fallback entry.
- The metadata tag `Window` was incorrect for the platform name. I corrected it to `Windows`.

## Review Notes
- The post is technically valid after the fixes above.
- The cmdlets used here are current in the Windows `DnsClient` and `NetAdapter` modules on supported Windows 10, Windows 11, and Windows Server releases documented by Microsoft Learn.
- These commands typically require an elevated PowerShell or Command Prompt session to modify adapter DNS settings.
- `Resolve-DnsName` is valid as written; for stricter DNS-only troubleshooting, `-DnsOnly` can be useful, but it is not required for correctness here.
