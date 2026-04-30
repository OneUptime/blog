# Validation Summary: How to Flush DNS Cache on Linux, macOS, and Windows

## Status
validated

## Post Type
Guide / Troubleshooting reference

## Technologies Covered
- DNS client caching
- Linux `systemd-resolved`
- Linux `nscd`
- Linux `dnsmasq`
- macOS `mDNSResponder`
- macOS `dscacheutil`
- Windows DNS Client
- Windows `ipconfig`
- Windows PowerShell `DnsClient` cmdlets

## Sources Consulted
- systemd `resolvectl` man page: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- `dnsmasq` man page: https://dnsmasq.org/docs/dnsmasq-man.html
- Microsoft Learn `ipconfig`: https://learn.microsoft.com/en-gb/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn `Clear-DnsClientCache`: https://learn.microsoft.com/en-us/powershell/module/dnsclient/clear-dnsclientcache?view=windowsserver2022-ps
- Microsoft Learn `Get-DnsClientCache`: https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientcache?view=windowsserver2025-ps
- RFC 1035, Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035
- Apple Developer DNS Service Discovery introduction (`mDNSResponder` background): https://developer.apple.com/library/archive/documentation/Networking/Conceptual/dns_discovery_api/Introduction.html
- Apple Developer Bonjour FAQ (`mDNSResponder` background): https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/NetServices/Articles/faq.html
- Apple Open Source `mDNSResponder` repository: https://github.com/apple-oss-distributions/mDNSResponder

## Issues Found
- The `systemd-resolved` section used `resolvectl flush-caches eth0`, but `flush-caches` is a global operation with no per-interface argument. I removed that line and changed the follow-up example to a plain resolution test.
- The `systemd-resolved` section said `resolvectl statistics` should reset counters to zero after a flush. That is incorrect; cache flushing and statistic resetting are separate operations. I changed the text to say it inspects resolver statistics.
- The `dnsmasq` section said `SIGUSR1` flushes or reloads the cache. Official `dnsmasq` documentation says `SIGHUP` clears the cache, while `SIGUSR1` logs statistics. I corrected the signal and removed the "restart is the only way to flush" claim.
- The Linux verification text inferred that TTL values prove whether the answer was freshly looked up locally. That overstates what `dig` can show because upstream recursive resolvers may still be serving cached data. I rewrote the verification guidance to compare returned answers instead of inferring from TTL.
- The Linux general example declared `OLD_IP` and `NEW_IP` but did not use them. I replaced that with a simpler expected-versus-resolved output example.
- The macOS section referred to resetting `NSCD`, which is not the macOS DNS cache mechanism described here. I removed that line and changed the verification note so it no longer claims a query command "forces" a fresh lookup.
- The Windows section suggested restarting the `dnscache` service as part of a "thorough flush" without grounding it in the official flush commands. I removed those lines and kept the official `ipconfig /flushdns` and `Clear-DnsClientCache` commands.
- The introduction and conclusion implied that flushing the local cache alone bypasses TTL waiting entirely. I corrected both to note that upstream recursive resolvers may still serve cached data until TTL expiry.

## Review Notes
- The post is now technically sound for the resolvers it explicitly covers.
- Not every Linux system uses `systemd-resolved`, `nscd`, or `dnsmasq`; some systems have no local DNS cache to flush, or cache elsewhere in the stack.
