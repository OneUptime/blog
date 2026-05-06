# Validation Summary: How to Understand How Clients Choose Between IPv4 and IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 and IPv6 dual-stack networking
- RFC 6724 address selection
- RFC 8305 Happy Eyeballs
- Linux `getaddrinfo()`, `gai.conf`, and `ip addrlabel`
- Python `socket`
- `curl`
- Windows `netsh` and PowerShell `Test-NetConnection`

## Sources Consulted
- RFC 6724, *Default Address Selection for Internet Protocol Version 6 (IPv6)*: https://www.rfc-editor.org/rfc/rfc6724
- RFC 8305, *Happy Eyeballs Version 2: Better Connectivity Using Concurrency*: https://www.rfc-editor.org/rfc/rfc8305
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Microsoft Learn, `netsh interface`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, `Test-NetConnection`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection
- Microsoft Learn, *Configure IPv6 for advanced users*: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Local `gai.conf(5)` manual page
- Local `ip-addrlabel(8)` manual page
- Local `curl` manual (`curl --manual`)

## Issues Found
- The post conflated Linux kernel address labels (`ip addrlabel list`) with glibc `getaddrinfo()` sorting policy. The wording was corrected so `ip addrlabel` and `/etc/gai.conf` are described as different parts of the behavior.
- The `gai.conf` policy example was incorrect. It duplicated `::ffff:0:0/96`, omitted several RFC 6724 default entries, and included `64:ff9b::/96` as though it were part of the RFC 6724 default table. The table was replaced with the RFC 6724 defaults.
- Several destination-address-selection rules were misnumbered or misdescribed. The post now correctly identifies matching label as Rule 5, higher precedence as Rule 6, smaller scope as Rule 8, longest matching prefix as Rule 9, and the final tiebreaker as leaving the original order unchanged.
- The text described `getaddrinfo()` as a system call. It was corrected to a library call/API.
- The Happy Eyeballs diagram oversimplified RFC 8305 as “IPv6 first, then IPv4 after 250 ms.” It was corrected to show RFC 6724 sorting followed by interleaving and staggered connection attempts.
- The resolver-check comment incorrectly attributed `getaddrinfo()` ordering to Happy Eyeballs. It now describes the output as local address-selection policy order.
- The Linux preference-change example said to add a single `precedence` line to `/etc/gai.conf`. On glibc, adding any `precedence` line disables the default precedence table, so the note was corrected.
- The mixed shell/Python snippet under “Modifying Address Selection Preferences” was not valid bash as written. It was converted to a valid `python3` here-document inside the shell block.
- The Windows example used an invalid command, `netsh interface ipv6 set prefixpolicies`. It was replaced with the valid `set prefixpolicy` form and a more accurate `Test-NetConnection` example.

## Review Notes
- `Happy Eyeballs` is implemented by applications or libraries, not by `getaddrinfo()` itself, so exact connection timing still varies by client.
- `/etc/gai.conf` is a glibc-specific mechanism; other Linux libc implementations may not use it.
