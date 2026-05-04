# Validation Summary: How to Configure IPv6 DNS Servers on Windows

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6
- Windows networking
- PowerShell DnsClient module (Set-DnsClientServerAddress, Get-DnsClientServerAddress, Resolve-DnsName, Clear-DnsClientCache, Get-DnsClientCache, Set-DnsClientGlobalSetting, Set-DnsClient, Test-NetConnection)
- netsh interface ipv6
- Windows GUI (ncpa.cpl)
- Public DNS providers: Google Public DNS, Cloudflare DNS, Quad9 DNS, OpenDNS
- ipconfig /flushdns

## Sources Consulted
- Microsoft Learn: Set-DnsClientServerAddress (https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress)
- Microsoft Learn: Get-DnsClientServerAddress (https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress)
- Microsoft Learn: Resolve-DnsName (https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname)
- Microsoft Learn: Clear-DnsClientCache, Get-DnsClientCache, Set-DnsClientGlobalSetting, Set-DnsClient
- Microsoft Learn: netsh interface ipv6 commands (https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-interface-ipv6)
- Google Public DNS IPv6 documentation (https://developers.google.com/speed/public-dns/docs/using) — 2001:4860:4860::8888 and 2001:4860:4860::8844
- Cloudflare 1.1.1.1 DNS documentation (https://one.one.one.one) — 2606:4700:4700::1111 and 2606:4700:4700::1001
- Quad9 DNS documentation (https://quad9.net) — 2620:fe::fe and 2620:fe::9
- OpenDNS / Cisco Umbrella documentation — 2620:119:35::35 and 2620:119:53::53

## Issues Found
No technical issues found.

All PowerShell cmdlets used in the post are valid members of the `DnsClient` module on modern Windows (Windows 8/Server 2012+) and the syntax is accurate. The `netsh interface ipv6` commands correctly use `dnsserver` (singular) for `add`/`delete` and `dnsservers` (plural) for `show`/`set`, which matches Microsoft's documented syntax. The IPv6 DNS server addresses listed for Google, Cloudflare, Quad9, and OpenDNS are all correct. The mixed IPv4/IPv6 example in `Set-DnsClientServerAddress` works as described — the cmdlet accepts both address families in a single `-ServerAddresses` array and the matching output table shows them split by Address Family.

## Review Notes
- The GUI section uses ```sql``` as the code-fence language tag for what is plain-text instructions. This is purely cosmetic (it does not affect rendering meaningfully) and does not represent a technical error, so it was not changed per the instruction to avoid stylistic edits.
- `netsh` is officially in maintenance mode on modern Windows; Microsoft recommends the PowerShell `DnsClient` cmdlets going forward. The post already presents PowerShell first, which aligns with current best practice.
- `Test-NetConnection ... -Port 53` only verifies TCP/53 reachability, not UDP/53 (DNS primarily uses UDP). For most DNS servers TCP/53 is also open, so the test still serves as a reachability check, but readers troubleshooting UDP-only environments should be aware of this nuance. Not a correctness issue with the post.
- `set dnsservers source=dhcp` for IPv6 requests DNS configuration via DHCPv6; on networks that only advertise DNS via RA/RDNSS (RFC 8106), this command alone may not pull DNS unless the host is configured to accept RDNSS. This is a Windows behavior nuance rather than a documentation error.
