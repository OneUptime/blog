# Validation Summary: How to Display the DNS Resolver Cache with ipconfig /displaydns

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows `ipconfig`
- Windows DNS client resolver cache
- PowerShell `Get-DnsClientCache`
- DNS record types and TTLs

## Sources Consulted
- Microsoft Learn: `ipconfig` command
  https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig?view=windows-server-2019
- Microsoft Learn: `Get-DnsClientCache` cmdlet
  https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientcache?view=windowsserver2025-ps
- Microsoft Learn: `findstr` command
  https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- Microsoft Learn: `find` command
  https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/find
- Microsoft Learn: `MSFT_DNSClientCache` class
  https://learn.microsoft.com/en-us/previous-versions/windows/desktop/legacy/hh872334(v=vs.85)
- Microsoft Learn: Troubleshooting DNS clients
  https://learn.microsoft.com/en-us/windows-server/networking/dns/troubleshoot/troubleshoot-dns-client
- IETF RFC 1035: Domain Names - Implementation and Specification
  https://datatracker.ietf.org/doc/html/rfc1035
- IETF RFC 3596: DNS Extensions to Support IP Version 6
  https://datatracker.ietf.org/doc/rfc3596/

## Issues Found
- The introduction said the resolver cache stores only recent lookup results. Microsoft documents that `ipconfig /displaydns` also shows entries preloaded from the local Hosts file, so that sentence was corrected.
- The `findstr` hostname example used regex mode implicitly, where `.` is a wildcard. It was changed to `/c:"google.com"` so it performs a literal match as described.
- The `findstr "A (Host)"` example was changed to `/c:"A (Host)"` so the string is treated literally.
- The “Count total cached entries” command only filtered matching lines and did not count them. It was corrected to pipe the filtered lines into `find /c`.
- The negative-cache section described undocumented behavior around `Record Type 0` and inferred negatives from `DataLength`. Microsoft documents negative cached statuses as `NotExist` and `NoRecords`, and Microsoft’s DNS troubleshooting guidance calls out `Name does not exist` in `ipconfig /displaydns`, so the section was corrected to use `Get-DnsClientCache -Status NotExist,NoRecords`.
- The stale-entry example claimed to find TTL values greater than one hour, but the command only printed all TTL lines. It was replaced with a PowerShell filter that actually selects entries with `TimeToLive -gt 3600`.
- The stale-entry follow-up said to “re-resolve” with `nslookup`. Microsoft documents that `nslookup` does not use the client DNS cache, so the text was corrected to say it verifies the current DNS answer from the server.

## Review Notes
- `Get-DnsClientCache` is documented for Windows 8 / Windows Server 2012 and later. The post does not state version limits, but all PowerShell examples assume that cmdlet is available.
