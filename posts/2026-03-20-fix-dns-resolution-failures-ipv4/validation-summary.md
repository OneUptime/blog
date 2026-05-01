# Validation Summary: How to Fix DNS Resolution Failures on IPv4 Networks

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- DNS
- IPv4 networking
- Windows DNS client troubleshooting (`ping`, `ipconfig`, `nslookup`, PowerShell `DnsClient` cmdlets)
- Linux DNS troubleshooting (`resolvectl`, `/etc/resolv.conf`, `dig`, `nmcli`, `systemctl`, `ss`)
- macOS DNS troubleshooting (`scutil`, `dscacheutil`, `mDNSResponder`)

## Sources Consulted
- Microsoft Learn: `ping` command documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Microsoft Learn: `ipconfig` command documentation: https://learn.microsoft.com/en-gb/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `nslookup` command documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- Microsoft Learn: `Set-DnsClientServerAddress`: https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: `Get-DnsClientServerAddress`: https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: `Clear-DnsClientCache`: https://learn.microsoft.com/en-us/powershell/module/dnsclient/clear-dnsclientcache?view=windowsserver2025-ps
- Microsoft Learn: Troubleshooting DNS clients: https://learn.microsoft.com/en-us/windows-server/networking/dns/troubleshoot/troubleshoot-dns-client
- systemd documentation: `systemd-resolved.service`: https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html
- systemd documentation: `resolvectl`: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- NetworkManager reference: `nmcli`: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager reference: IPv4 settings (`ignore-auto-dns`, `dns`, `method`): https://networkmanager.dev/docs/api/latest/settings-ipv4.html
- ISC BIND documentation: DNSSEC Guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- Local runtime help and man pages used for syntax verification: `resolvectl --help`, `nmcli connection help`, `dig -h`, `man 5 resolv.conf`

## Issues Found
- Replaced deprecated or no-longer-current Linux resolver commands. The post used `systemd-resolve --status` and `systemd-resolve --flush-caches`; these were updated to `resolvectl status` and `resolvectl flush-caches`, and the Linux cache check was updated to `resolvectl statistics`, which matches current systemd documentation and current runtime help.
- Corrected an overbroad diagnostic claim in the opening test. A failed `ping google.com` does not always prove DNS is broken; it now explicitly says the failure is meaningful when the error is name-resolution related (`could not find host`).
- Removed the Windows `net stop dnscache` / `net start dnscache` step. The documented cache-clearing method is `ipconfig /flushdns` (and PowerShell `Clear-DnsClientCache`), so the post now sticks to the supported cache flush path instead of suggesting an extra service restart.
- Fixed the Linux DNS override example so it behaves as described. The `/etc/resolv.conf` example no longer adds a generic `options ndots:5` line, and it now clarifies that direct editing is a temporary test for systems that manage that file directly. The NetworkManager example now adds `ipv4.ignore-auto-dns yes`, because otherwise manual DNS servers can be merged with DHCP-provided DNS instead of replacing them.
- Corrected the DNSSEC explanation. `dig ... +dnssec` requests DNSSEC records, but by itself it does not prove a response is legitimate; the note now correctly tells readers to look for validation indicators such as the `AD` flag from a validating resolver.
- Corrected the NXDOMAIN explanation. `nslookup` should return `NXDOMAIN` / `Non-existent domain` for a nonexistent name; it does not return a browser-style redirect page.
- Softened one absolute statement. A clearly invalid configured DNS server is now described as likely the root cause rather than definitively the root cause.

## Review Notes
- The post is now technically sound for a general 2026 troubleshooting guide, but Linux DNS configuration remains distro-dependent. On many modern systems, `/etc/resolv.conf` is generated or managed by `systemd-resolved` or NetworkManager, so persistent DNS changes should usually be made through the network manager in use rather than by editing the file directly.
- Seeing a local stub resolver such as `127.0.0.53` in `/etc/resolv.conf` is not automatically a misconfiguration on systemd-based systems.
- Some service names in the Linux server section are distro-specific. For example, BIND may run as `named` on some distributions and `bind9` on others.
