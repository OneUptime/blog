# Validation Summary: How to Clear the ARP Cache

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP
- Linux networking (`iproute2`, `arp`, `sysctl`)
- Windows networking (`netsh`, `arp`, PowerShell `Remove-NetNeighbor`)
- macOS networking (`arp`)

## Sources Consulted
- Linux `ip-neighbour(8)` manual: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- Linux `arp(7)` manual: https://man7.org/linux/man-pages/man7/arp.7.html
- Microsoft Learn, `netsh interface`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, `arp`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/arp
- Microsoft Learn, `Remove-NetNeighbor`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netneighbor?view=windowsserver2022-ps
- macOS `arp(8)` man page mirror: https://www.manpagez.com/man/8/arp/osx-10.7.php
- Apple Developer, reading UNIX man pages: https://developer.apple.com/documentation/os/reading-unix-manual-pages

## Issues Found
- The Linux example `ip neigh flush all` was not valid `ip neigh` syntax. It was changed to `ip -4 neigh flush nud all`, and the Linux `ip` examples were scoped with `-4` so they target ARP entries specifically instead of the broader neighbor cache.
- The Linux verification text and timeout explanation overstated cache behavior. The post now reflects that reachable time is randomized around the default base reachable time, and that `gc_stale_time` controls how often stale entries are checked rather than acting as a strict per-entry deletion timer.
- The Windows Command Prompt block used `#` comments, which are not valid in `cmd`, and used the older `netsh interface ip` form. The post now uses `REM` comments and `netsh interface ipv4 delete arpcache`, matching current Microsoft documentation.
- The PowerShell examples were too broad for an ARP-specific article because `Remove-NetNeighbor` operates on the neighbor cache. They were updated to include `-AddressFamily IPv4` so the commands are explicitly limited to ARP entries.
- The macOS section included a non-official `ip` example. It was replaced with documented `arp` usage, and the all-entries flush example was normalized to the documented `arp -d -a` form.

## Review Notes
- On Linux, `ip -4 neigh flush dev eth0` clears non-permanent ARP cache entries on that interface by default. The `nud all` example is the one that targets all ARP entry states across interfaces.
- The legacy Linux `arp` command is still valid where installed, but many modern distributions prefer `iproute2` tools and may not install `net-tools` by default.
- The author GitHub URL resolves, and the three related-reading links correspond to existing posts in the repository.
