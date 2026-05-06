# Validation Summary: How to Configure DHCP Reservations for Static Assignments

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- DHCPv4 reservations / static DHCP
- ISC DHCP (`dhcpd`)
- `dnsmasq`
- Windows Server DHCP PowerShell (`DhcpServer` module)
- MAC address lookup commands on Linux, macOS, and Windows
- ARP

## Sources Consulted
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC notice that ISC DHCP server reached end of life: https://www.isc.org/blogs/isc-dhcp-eol/
- Ubuntu Server documentation for `isc-dhcp-server`: https://documentation.ubuntu.com/server/how-to/networking/install-isc-dhcp-server/index.html
- `dnsmasq` man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Microsoft Learn, `Add-DhcpServerv4Reservation`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4reservation?view=windowsserver2025-ps
- Microsoft Learn, `Get-DhcpServerv4Reservation`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv4reservation?view=windowsserver2025-ps
- Microsoft Learn, `Remove-DhcpServerv4Reservation`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/remove-dhcpserverv4reservation?view=windowsserver2025-ps
- Microsoft Learn, Quickstart: Install and configure DHCP Server: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/quickstart-install-configure-dhcp-server
- Microsoft Learn, DHCP scopes in Windows Server: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-scopes
- Microsoft Learn, reservation range behavior in Windows Server: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/cant-add-dhcp-reservation
- Microsoft Learn, `ipconfig`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig?view=windows-server-2019
- Microsoft Learn, `arp`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/arp

## Issues Found
- The post said reserved clients "still use the DORA process" every time. I changed this to say the client still uses DHCP and, on initial address acquisition, follows the normal DISCOVER/OFFER/REQUEST/ACK flow. RFC 2131 describes additional client states such as renew/rebind, so the original wording was too absolute.
- The ISC section presented `dhcpd` as if it were a normal current recommendation. I marked the section as legacy and added that ISC DHCP is end-of-life upstream, because ISC officially ended active maintenance even though existing deployments still function.
- The restart command under ISC DHCP was written as a generic apply step. I changed it to "Apply on Debian/Ubuntu" because `isc-dhcp-server` is a distro-specific service name documented by Ubuntu, not a universal service name across all Linux distributions.
- The ARP lookup example used `grep` without an OS qualifier. I clarified that the `arp -a | grep ...` example is for Linux/macOS so it is not confused with the Windows command shown above it.
- The best-practices section incorrectly generalized that reservation IPs should live outside the dynamic pool. I rewrote this guidance because Windows Server reservations must be valid within the scope's distribution range, and exclusion ranges are primarily for manually assigned static addresses; whether reservations sit inside or outside the dynamic pool depends on the DHCP server.
- The key takeaways used overly absolute wording such as reservations being "superior" to static IPs. I softened this to a technically defensible statement that reservations can be preferable because DHCP still centralizes option delivery.

## Review Notes
- The configuration snippets and PowerShell cmdlets are valid after the edits.
- `dnsmasq` supports the documented `dhcp-host=MAC,IP[,hostname[,lease-time]]` syntax, including `infinite`, and supports `dhcp-ignore=tag:!known` for whitelist-style behavior.
- The Linux interface name `eth0` is only an example; many current systems use names such as `ens33` or `enp0s3`.
- The Windows filter `findstr "Physical"` assumes English command output. The underlying `ipconfig /all` command is correct, but localized systems may display a different label.
