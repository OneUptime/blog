# Validation Summary: How to Fix Duplicate IPv4 Address Detection Errors

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows IPv4 duplicate address detection (DAD)
- ARP
- DHCP
- ISC DHCP (`dhcpd`)
- PowerShell
- Nmap
- `arping`
- `arpwatch`

## Sources Consulted
- RFC 5227: IPv4 Address Conflict Detection: https://www.rfc-editor.org/rfc/rfc5227
- Microsoft Learn: Event ID 4199 and Windows client can't get an IP address from the DHCP server: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/event-4199-windows-client-cannot-get-ip-address-dhcp-server
- Microsoft Learn: Get-WinEvent: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-7.5
- Microsoft Learn: Get-NetIPAddress: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: Set-NetIPInterface: https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: `ipconfig`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig?view=windows-server-2019
- Microsoft Learn: `arp`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/arp
- ISC DHCP 4.4 `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC KB: Reducing DHCP memory consumption by careful use of `range6` statements: https://kb.isc.org/docs/aa-01464
- Nmap Host Discovery reference: https://nmap.org/man/man-host-discovery.html
- `arping(8)` manual page: https://man7.org/linux/man-pages/man8/arping.8.html
- `arpwatch(8)` manual page: https://man.archlinux.org/man/arpwatch.8.en

## Issues Found
- Replaced `Get-EventLog` with `Get-WinEvent` and added `Get-NetIPAddress` address-state checking. The original command used a deprecated API and did not show the supported way to verify that Windows marked an address as `Duplicate`.
- Corrected the Windows behavior description. The original post said Windows disables the adapter; the reviewed documentation supports that Windows marks the duplicate IPv4 address unusable, which is narrower and more accurate.
- Narrowed the `arping` guidance to Linux and corrected the documented argument order to `arping -c 5 -I eth0 192.168.1.50`.
- Clarified that `ipconfig /release` and `ipconfig /renew` apply to DHCP clients. A statically addressed interface must be reconfigured instead.
- Fixed the ISC DHCP IPv4 guidance so fixed addresses do not overlap the dynamic `range`. ISC documents that IPv4 dynamic pools and static assignments should not overlap.
- Removed the lease-file truncation advice. Truncating `dhcpd.leases` can cause the server to forget active leases and reissue them. Replaced that subsection with the documented Windows false-positive scenario caused by switch/router ARP probing during DAD and the corresponding `Set-NetIPInterface -DadTransmits 0` workaround.
- Changed Step 5 from enabling `ping-check` to verifying it. ISC DHCP already performs ping checks for candidate dynamic IPv4 leases by default unless that behavior is disabled.
- Replaced the ARP-cache monitoring script with `arpwatch`. A normal ARP cache stores one MAC per IP at a time, so the original script could not reliably detect duplicate-address conflicts.

## Review Notes
- ISC DHCP is end-of-life upstream. The corrected examples are still technically valid for existing deployments, but future posts should prefer Kea or explicitly label ISC DHCP as legacy software.
- Event ID 4199 confirms duplicate-address-detection activity, not necessarily a real two-host IP conflict. The corrected post now distinguishes that from `arping` evidence.
- `nmap`, `arping`, and `arpwatch` are not guaranteed to be installed by default, so readers still need the relevant tools available on the systems where they run the commands.
