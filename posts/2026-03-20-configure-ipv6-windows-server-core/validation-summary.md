# Validation Summary: How to Configure IPv6 on Windows Server Core

## Status
validated

## Post Type
Tutorial / Technical How-To Guide

## Technologies Covered
- Windows Server Core
- PowerShell (NetTCPIP module: `Get-NetAdapter`, `New-NetIPAddress`, `Set-DnsClientServerAddress`, `Get-NetIPConfiguration`, `Set-NetIPInterface`, `Rename-NetAdapter`, `Test-NetConnection`, `Resolve-DnsName`)
- netsh (`netsh interface ipv6` command set)
- IPv6 networking (RFC 4291 addressing, default routes, DNS over IPv6)

## Sources Consulted
- Microsoft Learn — NetTCPIP module reference: https://learn.microsoft.com/en-us/powershell/module/nettcpip/
- Microsoft Learn — `New-NetIPAddress`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress
- Microsoft Learn — `Set-DnsClientServerAddress`: https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress
- Microsoft Learn — `Set-NetIPInterface`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface
- Microsoft Learn — `Get-NetAdapterBinding`: https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterbinding
- Microsoft Docs — netsh interface ipv6 commands: https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-interface-ipv6
- Microsoft Docs — Windows Server Core overview: https://learn.microsoft.com/en-us/windows-server/administration/server-core/what-is-server-core
- RFC 3849 — IPv6 documentation address prefix `2001:db8::/32`
- Google Public DNS — IPv6 addresses `2001:4860:4860::8888` / `2001:4860:4860::8844`: https://developers.google.com/speed/public-dns/docs/using

## Issues Found
- **Misleading comment in startup script section.** The persistent-configuration block contained the comment `# This is useful if Netplan/NetworkManager is not available`. Netplan and NetworkManager are Linux networking tools and have no relevance on Windows Server Core. Replaced with a Windows-appropriate note: `# Run via Task Scheduler at boot or with Group Policy startup scripts`, which matches the actual mechanisms used to persist scripts on Server Core.

## Review Notes
- All PowerShell cmdlets (`Get-NetAdapter`, `Get-NetIPAddress`, `Get-NetIPConfiguration`, `Get-NetAdapterBinding -ComponentID ms_tcpip6`, `New-NetIPAddress`, `Set-DnsClientServerAddress`, `Rename-NetAdapter`, `Test-NetConnection`, `Resolve-DnsName`, `Set-NetIPInterface`, `Get-NetIPInterface`, `Remove-NetIPAddress`) are valid and ship in the NetTCPIP / NetAdapter / DnsClient modules included with Server Core.
- The `ms_tcpip6` ComponentID for the IPv6 binding check is correct.
- All netsh syntax is valid: positional `add address <interface> <addr>/<prefix>`, `add route <prefix> <interface> <nexthop>`, and `add dnsserver <interface> <addr> index=<n>` all match the documented forms.
- The `tracert -6` flag is the correct way to force an IPv6 traceroute on Windows.
- IPv6 documentation prefix `2001:db8::/32` is correctly used per RFC 3849.
- Google Public DNS IPv6 addresses (`2001:4860:4860::8888` / `::8844`) are correct.
- The persistent-configuration script intentionally includes an IPv4 fallback DNS (`8.8.8.8`) alongside IPv6 entries; `Set-DnsClientServerAddress` accepts a mixed-family list, so this is valid (though somewhat unusual to see in an IPv6-focused example).
- Minor stylistic point (not changed): netsh in Windows is increasingly deprecated in favor of the NetTCPIP PowerShell cmdlets, but it remains fully supported and is still genuinely useful on Server Core, so showing both tool families is appropriate.
