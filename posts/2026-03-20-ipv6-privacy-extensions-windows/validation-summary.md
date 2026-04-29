# Validation Summary: How to Configure IPv6 Privacy Extensions on Windows - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 temporary/privacy addresses
- Windows 10 and Windows 11 networking
- PowerShell `NetTCPIP` cmdlets
- `netsh interface ipv6`
- SLAAC and router advertisements
- Group Policy startup scripts / enterprise configuration management

## Sources Consulted
- Microsoft Learn: `Get-NetIPv6Protocol`  
  https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipv6protocol?view=windowsserver2025-ps
- Microsoft Learn: `Set-NetIPv6Protocol`  
  https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipv6protocol?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetIPAddress`  
  https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `Get-NetIPInterface`  
  https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: `netsh interface` command reference  
  https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `NL_SUFFIX_ORIGIN` enumeration  
  https://learn.microsoft.com/en-us/windows-hardware/drivers/network/nl-suffix-origin
- Microsoft Learn: Guidance for configuring IPv6 in Windows for advanced users  
  https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- IETF RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6  
  https://datatracker.ietf.org/doc/rfc8981/

## Issues Found
- The post used unsupported or incorrect PowerShell patterns for `Get-NetIPv6Protocol` and `Set-NetIPv6Protocol`, including nonexistent `-InterfaceAlias` usage and invalid property names such as `PrefixDelegationEnabled`. I replaced those with documented global settings and valid properties from the NetTCPIP cmdlets.
- The post treated privacy-extension configuration as per-interface in both PowerShell and `netsh`, but Microsoft documents these settings as global IPv6 protocol/privacy settings. I removed the invalid per-interface examples and kept supported global commands.
- The post described `RegenerateTime` as the main control for address rotation frequency and passed a bare integer to a `TimeSpan` parameter. Microsoft documents `MaxTemporaryPreferredLifetime` as the setting that controls how long a temporary address remains preferred, so I corrected the explanation and the command syntax.
- The verification text incorrectly implied Windows exposes temporary addresses as a `"Temporary"` type and used outdated suffix-origin names such as `OriginDhcp` and `LinkLayerAddress`. I corrected the post to use the documented `SuffixOrigin` values exposed by `Get-NetIPAddress`, especially `Random` for privacy addresses.
- The Group Policy section pointed to `IPv6 Transition Technologies` as if it controlled privacy extensions and used unsupported registry examples with invalid `Set-ItemProperty -Type` syntax. I replaced that section with an accurate note that the Administrative Template area is for 6to4/ISATAP/Teredo and showed supported PowerShell or `netsh` commands suitable for startup-script deployment.
- The static IPv6 example used an invalid literal address (`2001:db8::server1`). I replaced it with a syntactically valid documentation-prefix example.
- The troubleshooting section queried `RouterDiscovery` from `Get-NetIPv6Protocol`, which does not expose that property, and suggested `netsh interface ipv6 show interfaces` for RA flag verification. I replaced those checks with documented `Get-NetIPInterface` and `Get-NetIPAddress` commands that match how Windows exposes router discovery and SLAAC-derived addresses.
- The closing summary simplified Windows behavior too far by saying addresses rotate approximately every 24 hours. I corrected it to the documented default preferred lifetime of 1 day and valid lifetime of 7 days.

## Review Notes
- Temporary IPv6 addresses are associated with SLAAC prefixes learned from router advertisements. Environments using DHCPv6 for addressing without SLAAC will not show `SuffixOrigin Random` privacy addresses.
- The post now uses current, documented command surfaces rather than direct registry editing for privacy-extension management.
