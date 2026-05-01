# Validation Summary: How to Fix Duplicate IPv4 Address Detection Issues

## Status
validated

## Post Type
Guide / Troubleshooting guide

## Technologies Covered
- IPv4
- ARP
- RFC 5227 IPv4 Address Conflict Detection
- Linux networking tools (`arping`, `ip`, `arp`, `nmcli`, `networkctl`)
- ISC DHCP
- systemd-networkd
- NetworkManager
- Windows networking commands (`ipconfig`, `arp`, `netsh trace`, `Get-WinEvent`)
- Nmap

## Sources Consulted
- RFC 5227, "IPv4 Address Conflict Detection": https://www.rfc-editor.org/rfc/rfc5227
- Linux kernel documentation, "IP Sysctl": https://docs.kernel.org/5.10/networking/ip-sysctl.html
- systemd `networkctl` manual: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- systemd `systemd.network` manual: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- ISC DHCP `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- `arping(8)` manual for iputils: https://manpages.debian.org/trixie/iputils-arping/arping.8.en.html
- `arp(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/arp.8.html
- Nmap host discovery reference: https://nmap.org/man/man-host-discovery.html
- Microsoft Learn, `ipconfig`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig?view=windows-server-2019
- Microsoft Learn, `arp`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/arp
- Microsoft Learn, `netsh trace`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-trace
- Microsoft Learn, `Get-WinEvent`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-7.5
- PowerShell regular expressions reference: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_regular_expressions?view=powershell-7.6
- Microsoft Learn, duplicate-address detection / Event ID 4199 note: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/event-4199-windows-client-cannot-get-ip-address-dhcp-server

## Issues Found
- The ARP cache section incorrectly told readers to look for "duplicate MACs" in a single table snapshot. For duplicate IPv4 conflicts, the useful signal is the same IP resolving to different MAC addresses over time or multiple MACs replying to `arping`. I corrected the explanation accordingly.
- The NetworkManager example changed `ipv4.addresses` but did not set `ipv4.method manual`. Official `nmcli` documentation shows manual addressing should set the method explicitly, so I added `ipv4.method manual` to make the example reliable.
- The Linux ARP sysctl section incorrectly described `arp_announce` as enabling gratuitous ARP on address assignment and used `arp_ignore`, which controls reply behavior rather than conflict detection. I retitled the section and replaced the example with `arp_notify`, a correct description of `arp_announce`, and the existing `arping -A` announcement command.
- The "Preventing Future Conflicts" section implied that static ARP entries prevent duplicate IP assignments. They only pin an IP-to-MAC mapping on the local host. I retitled the section to make that scope explicit and removed the misleading "Permanent static ARP" wording.
- The Windows `Get-WinEvent` example used `\|` in a PowerShell regex. In PowerShell/.NET regex, that escapes the pipe character instead of acting as alternation, so the filter was wrong. I fixed the pattern and narrowed the query to the `Tcpip` provider for more relevant event log results.
- The Linux log-grep examples were tightened to use `grep -E`, and `/var/log/syslog` is now marked as conditional because it is distro-dependent.
- The `nmap -sn` comment said it would "scan network" while targeting a single IP. I adjusted the wording so it matches what the command actually does in that example.
- The Linux DHCP client renewal example was clarified as `dhclient`-specific because not all Linux systems use `dhclient`.

## Review Notes
- The post is technically valid after correction, but several commands remain environment-specific: `eth0`, `/var/log/syslog`, `dhclient`, `systemctl restart networking`, and the exact NetworkManager connection name all vary by distribution and host configuration.
- `arp` is a legacy interface on modern Linux systems. The post now keeps it for compatibility, but `ip neigh` is the more current neighbor-management interface.
- The MAC vendor lookup uses a third-party service (`macvendors.com` / `api.macvendors.com`). The URLs are currently reachable, but they are not an official standards or platform document and may change independently of the core troubleshooting workflow.
