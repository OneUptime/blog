# Validation Summary: How to Configure IPv6 on Windows DNS Server

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Windows DNS Server (PowerShell `DnsServer` module)
- IPv6 (AAAA records, ip6.arpa reverse DNS, nibble format)
- PowerShell cmdlets: `Get-DnsServerSetting`, `Set-DnsServerSetting`, `Add-DnsServerResourceRecordAAAA`, `Remove-DnsServerResourceRecord`, `Add-DnsServerPrimaryZone`, `Add-DnsServerResourceRecordPtr`, `Add-DnsServerForwarder`, `Set-DnsServerPrimaryZone`, `Resolve-DnsName`
- DNS Manager MMC snap-in (`dnsmgmt.msc`)
- Google Public DNS IPv6 (`2001:4860:4860::8888`, `2001:4860:4860::8844`)

## Sources Consulted
- Microsoft Learn — Set-DnsServerSetting: https://learn.microsoft.com/en-us/powershell/module/dnsserver/set-dnsserversetting
- Microsoft Learn — Get-DnsServerSetting: https://learn.microsoft.com/en-us/powershell/module/dnsserver/get-dnsserversetting
- Microsoft Learn — Add-DnsServerResourceRecordAAAA: https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverresourcerecordaaaa
- Microsoft Learn — Add-DnsServerResourceRecordPtr: https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverresourcerecordptr
- RFC 3596 (DNS Extensions to Support IP Version 6) — for nibble format ip6.arpa reverse zones
- Google Public DNS documentation (for IPv6 resolver addresses)

## Issues Found
1. **Incorrect `Set-DnsServerSetting` syntax in the "Make DNS Server Listen on IPv6" section.** The original post used `Set-DnsServerSetting -ListeningIPAddress "2001:db8::10", "192.168.1.10", "127.0.0.1"`, but per the official Microsoft docs, `Set-DnsServerSetting` does **not** expose a `-ListeningIPAddress` parameter — the only parameters are `-InputObject`, `-ComputerName`, `-PassThru`, `-CimSession`, `-ThrottleLimit`, `-AsJob`, `-WhatIf`, and `-Confirm`. The cmdlet must be driven by piping a modified settings CIM instance. Replaced the call with the documented pattern: get the settings with `-All`, mutate `ListeningIPAddress`, and pipe the object to `Set-DnsServerSetting`.

2. **`Get-DnsServerSetting` was missing `-All`.** The verification line `Get-DnsServerSetting | Select-Object ListeningIPAddress` would not surface `ListeningIPAddress`, because per the docs that property is part of the advanced settings set returned only when `-All` is specified ("To get advanced DNS server settings, use the *All* parameter"). Added `-All`.

## Review Notes
- The IPv6 nibble-format math is correct. For `2001:db8::/32` the reverse zone `8.b.d.0.1.0.0.2.ip6.arpa` is right (first 32 bits → 8 nibbles, reversed). For `2001:db8::10` the relative PTR name `0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0` (24 nibbles) inside that zone is also correct, matching RFC 3596.
- The Google Public DNS IPv6 resolver addresses (`2001:4860:4860::8888`, `2001:4860:4860::8844`) are accurate.
- `dnsmgmt.msc` is the correct MMC snap-in name for DNS Manager on Windows Server.
- `Add-DnsServerResourceRecordAAAA -Name "@"` for the zone apex: Microsoft's documentation describes `-Name` as "a host name" without explicitly defining `@` semantics. In practice many operators use `@` and it is widely treated as the apex by the cmdlet, but readers on stricter environments may prefer using the zone name itself or coordinating via the GUI's "(same as parent folder)" entry. This was not changed because it is not clearly wrong, just under-documented.
- All other cmdlets, parameter names, and example values (`Add-DnsServerForwarder`, `Set-DnsServerPrimaryZone -DynamicUpdate Secure`, `Add-DnsServerPrimaryZone -ReplicationScope "Domain"`, `Resolve-DnsName -Type AAAA -Server`) match the official Windows Server 2025 PowerShell reference.
