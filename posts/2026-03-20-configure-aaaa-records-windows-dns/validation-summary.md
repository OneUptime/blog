# Validation Summary: How to Configure AAAA Records in Windows DNS Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Server DNS
- IPv6
- AAAA DNS records
- PowerShell `DnsServer` module
- `nslookup`
- Active Directory-integrated DNS
- `repadmin`

## Sources Consulted
- Microsoft Learn: Manage DNS resource records using DNS server on Windows Server — https://learn.microsoft.com/en-us/windows-server/networking/dns/manage-resource-records
- Microsoft Learn: Add-DnsServerResourceRecordAAAA — https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverresourcerecordaaaa?view=windowsserver2025-ps
- Microsoft Learn: Get-DnsServerResourceRecord — https://learn.microsoft.com/en-us/powershell/module/dnsserver/get-dnsserverresourcerecord?view=windowsserver2025-ps
- Microsoft Learn: Remove-DnsServerResourceRecord — https://learn.microsoft.com/en-us/powershell/module/dnsserver/remove-dnsserverresourcerecord?view=windowsserver2022-ps
- Microsoft Learn: Resolve-DnsName — https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps
- Microsoft Learn: Active Directory-Integrated DNS Zones — https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/active-directory-integrated-dns-zones
- Microsoft Learn: DNS zones in DNS Server on Windows Server — https://learn.microsoft.com/en-us/windows-server/networking/dns/zone-types
- Microsoft Learn: Repadmin /replsummary — https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc835092(v=ws.11)
- Microsoft Learn: Repadmin /syncall — https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc835086(v=ws.11)
- Microsoft Learn: Dnscmd — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/dnscmd

## Issues Found
- The PowerShell zone-apex example used `-Name "@"`. I changed it to `-Name "."` and updated the note to match Microsoft’s `DnsServer` cmdlet convention for targeting the zone root in PowerShell examples.
- The CSV example said to create `records.csv` but imported `C:\dns-records.csv`. I aligned the example so the documented filename matches the command being run.
- The `cmd` example used `#` comment markers, which are not valid in Command Prompt. I changed them to `REM` so the snippet is valid `cmd` syntax.
- The `repadmin /syncall` example omitted the required target domain controller argument from Microsoft’s documented syntax. I changed it to `repadmin /syncall DC01 /A /d /e` and clarified that `DC01` is a placeholder.
- The AD-integrated replication explanation said records replicate to “all DNS servers,” which is broader than Microsoft’s documented behavior. I corrected it to reflect AD replication to other domain controllers running DNS according to the zone’s replication scope.
- The summary repeated the same overbroad AD replication claim. I corrected that wording there as well.

## Review Notes
- `Resolve-DnsName` is correctly used here. Microsoft documents that its default query type is `A_AAAA`, so the example without `-Type` does query both A and AAAA records.
- The post’s “round-robin” wording for multiple AAAA records is acceptable. Windows DNS supports round-robin responses for multiple host records of the same name, and Microsoft documents round robin as enabled by default.
- Microsoft currently hosts the `repadmin` command references under previous-versions documentation pages, but those pages still document the standard command syntax used for modern Active Directory troubleshooting.
