# Validation Summary: How to Configure Windows DNS Server for IPv6 Zones

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Windows Server DNS
- PowerShell DnsServer module (`Add-DnsServerPrimaryZone`, `Add-DnsServerResourceRecord`, `Set-DnsServerSetting`, `Add-DnsServerForwarder`, `Add-DnsServerConditionalForwarderZone`, `Resolve-DnsName`)
- IPv6 (AAAA records, PTR records)
- ip6.arpa reverse DNS zones
- Active Directory-integrated DNS
- nslookup

## Sources Consulted
- [Add-DnsServerPrimaryZone (DnsServer) | Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverprimaryzone)
- [Add-DnsServerResourceRecord (DnsServer) | Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverresourcerecord)
- [Set-DnsServerSetting (DnsServer) | Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/dnsserver/set-dnsserversetting)
- [Add-DnsServerForwarder (DnsServer) | Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverforwarder)
- [Add-DnsServerConditionalForwarderZone (DnsServer) | Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverconditionalforwarderzone)
- [Resolve-DnsName (DnsClient) | Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname)
- [about_Parsing - PowerShell | Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing)
- RFC 3596 (DNS Extensions to Support IP Version 6)

## Issues Found

1. **Step 4 — /32 vs /64 reverse zone inconsistency**: The first command used `-NetworkId "2001:db8::/32"` (which generates the zone `8.b.d.0.1.0.0.2.ip6.arpa`, 8 nibbles), but the "Or create manually" example created `0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa` (16 nibbles, a /64 zone). The "Or create manually" wording implied equivalence between two non-equivalent zones. Updated the comments to make explicit that the auto-generated zone for `/32` is `8.b.d.0.1.0.0.2.ip6.arpa`, and that the manually created zone is a more specific /64. The PTR record (added to the /64 zone) is correct as-is.

2. **Bulk Record Import — invalid PowerShell cast in argument mode**: The script used `New-TimeSpan -Seconds [int]$r.TTL`. Per the official PowerShell `about_Parsing` documentation, in argument mode `[int]$r.TTL` is treated as an expandable string with the literal text `[int]` followed by the variable expansion — it is NOT evaluated as a type cast. To force expression mode, parentheses are required. Changed to `([int]$r.TTL)` so the cast is actually applied before the integer is bound to `-Seconds`.

## Review Notes

- The PowerShell pattern `Get-DnsServer | Select -ExpandProperty ServerSetting | Select ListeningIPAddress` works, but `Get-DnsServerSetting -All | Select-Object ListeningIPAddress` is the more direct modern equivalent. Not a correctness issue, so left unchanged.
- Backtick line continuations are used throughout. Microsoft's own `about_Parsing` documentation recommends avoiding them (they're easy to break with trailing whitespace) and prefers splatting for long parameter lists. Stylistic only — left as the author wrote them.
- `2606:4700:4700::1111` and `2606:4700:4700::1001` are correctly identified as Cloudflare IPv6 resolvers.
- Reversed-nibble computations for `2001:db8::10` (last 64 bits → `0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0`) and the full FQDN in the `Resolve-DnsName` PTR test (32 nibbles + `.ip6.arpa`) were both verified correct.
- `Add-DnsServerResourceRecord` with `-NS -Name "@"` for the zone apex is supported by the DnsServer module — verified against Microsoft Learn examples.
