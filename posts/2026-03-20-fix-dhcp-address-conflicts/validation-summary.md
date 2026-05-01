# Validation Summary: How to Fix DHCP Address Conflicts

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- ISC DHCP (`dhcpd`)
- Windows Server DHCP PowerShell
- ARP and IPv4 address conflict detection
- `arping`
- `arp-scan`
- `nmap`

## Sources Consulted
- ISC DHCP 4.4 Manual Pages - `dhcpd.conf`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 Manual Pages - `dhcpd.leases`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdleases
- Microsoft Learn - `Get-DhcpServerv4Lease`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv4lease?view=windowsserver2025-ps
- Microsoft Learn - `Remove-DhcpServerv4Lease`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/remove-dhcpserverv4lease?view=windowsserver2025-ps
- Microsoft Learn - `Set-DhcpServerSetting`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserversetting?view=windowsserver2025-ps
- Nmap Reference Guide - Host Discovery: https://nmap.org/book/man-host-discovery.html
- `arping` man page: https://man.he.net/man8/arping
- `arp-scan` man page: https://manpages.debian.org/arp-scan
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131

## Issues Found
- The Linux duplicate-detection examples were not technically reliable. `arp -n | sort | uniq -w16 -d` does not correctly detect duplicate IP claimants, and `nmap -sn ... --open` does not produce the "same IP twice" behavior described. I replaced these with `arping`, `arp-scan`, and plain `nmap -sn` examples that match the tools' documented behavior.
- The lease-file check was looking for `conflict`, but ISC DHCP documents conflict-prevention results in the lease database as `binding state abandoned;`. I changed the lease-file and log examples to search for abandoned leases and `DHCPDECLINE`/abandon-related log messages.
- `arping -D` was described as a way to identify both devices using the same IP. The documented DAD mode is for duplicate-address detection, not for the "find both devices" workflow described here. I replaced it with normal `arping` plus a subnet `arp-scan` filter so the commands align with the explanation.
- The Windows PowerShell section used the wrong cmdlets for current DHCP conflict handling and set conflict detection at the wrong level. I replaced `Get-DhcpServerv4Conflict` and `Remove-DhcpServerv4Conflict` with the documented `Get-DhcpServerv4Lease -BadLeases` and `Remove-DhcpServerv4Lease -BadLeases`, and replaced `Set-DhcpServerv4Scope -ConflictDetectionAttempts` with the documented server-level `Set-DhcpServerSetting -ConflictDetectionAttempts 1`.
- One cause statement and one takeaway were overly specific. I corrected the stale-lease scenario so it only becomes a conflict when the original device comes back online, and generalized the static-range takeaway so it does not prescribe arbitrary host-number ranges as a universal best practice.

## Review Notes
- ISC DHCP is end-of-life according to ISC. The corrected instructions are still useful for existing deployments, but future revisions of this post may want to mention that ISC DHCP is no longer maintained.
- The `isc-dhcp-server` service name, `/var/lib/dhcp/dhcpd.leases` path, and `eth0` interface name are environment-specific examples and may differ across Linux distributions.
