# Validation Summary: How to Flush the DNS Resolver Cache with ipconfig /flushdns

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows DNS client resolver cache
- Windows networking
- `ipconfig`
- PowerShell `DnsClient` cmdlets
- PowerShell remoting with `Invoke-Command`
- Windows services (`dnscache`)

## Sources Consulted
- Microsoft Learn: `ipconfig` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `Clear-DnsClientCache` https://learn.microsoft.com/en-us/powershell/module/dnsclient/clear-dnsclientcache
- Microsoft Learn: `Get-DnsClientCache` https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientcache
- Microsoft Learn: `Invoke-Command` https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/invoke-command
- Microsoft Learn: `Restart-Service` https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/restart-service
- Microsoft Learn: `Sc.exe query` https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-query
- Microsoft Learn: DNS Queries and Lookups in Windows and Windows Server https://learn.microsoft.com/en-us/windows-server/networking/dns/queries-lookups
- Microsoft Learn: Troubleshooting DNS clients https://learn.microsoft.com/en-us/windows-server/networking/dns/troubleshoot/troubleshoot-dns-client
- Microsoft Learn: Security guidelines for system services in Windows Server 2016 https://learn.microsoft.com/en-us/windows-server/security/windows-services/security-guidelines-for-disabling-system-services-in-windows-server
- Microsoft Learn: Clear method of the `MSFT_DNSClientCache` class https://learn.microsoft.com/en-us/windows/win32/fwp/wmi/dnsclientcimprov/clear-msft-dnsclientcache

## Issues Found
- The tags listed `Window` instead of `Windows`. Updated the tag to the correct platform name.
- The bullet `After modifying /etc/hosts on a Linux system you are testing against` was technically incorrect because flushing the local Windows DNS client cache does not apply to a remote Linux system's hosts file. Replaced it with a negative-caching scenario that matches Microsoft guidance about clearing cached `Name does not exist` responses.

## Review Notes
- `nslookup` bypasses the Windows DNS client cache and queries the configured DNS server directly, so it is appropriate for checking server-side DNS results after a flush.
- The remote `Invoke-Command` example is valid, but it requires PowerShell remoting and appropriate permissions on the target computer.
- `ping` can confirm name resolution, but ICMP reachability may still be blocked by a firewall even when DNS resolution is correct.
