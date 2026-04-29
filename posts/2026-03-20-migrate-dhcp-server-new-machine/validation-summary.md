# Validation Summary: How to Migrate a DHCP Server to a New Machine

## Status
validated

## Post Type
Guide

## Technologies Covered
- ISC DHCP (`dhcpd`)
- GNU `tar`
- `systemd` / `journalctl`
- Windows Server DHCP
- PowerShell
- DHCP relay

## Sources Consulted
- GNU tar manual, "Absolute File Names": https://www.gnu.org/software/tar/manual/html_node/absolute.html
- ISC DHCP `dhcpd` man page: https://kb.isc.org/v1/docs/isc-dhcp-41-manual-pages-dhcpd
- ISC DHCP `dhcpd.leases` man page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP failover guide: https://kb.isc.org/docs/aa-00502
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- Microsoft Learn: `Export-DhcpServer`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/export-dhcpserver?view=windowsserver2025-ps
- Microsoft Learn: `Import-DhcpServer`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/import-dhcpserver?view=windowsserver2025-ps
- Microsoft Learn: `Add-DhcpServerInDC`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverindc?view=windowsserver2025-ps
- Microsoft Learn: Migrate DHCP server to Windows Server: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/migrate-dhcp-server
- ISC DHCP product page / EOL notice: https://www.isc.org/dhcp/
- systemd `journalctl` man page: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The Linux archive and restore example had incorrect restore paths. GNU `tar` strips leading slashes from archived absolute paths by default, so the original `tmp/etc/...` copy commands would not restore the files that were archived. I changed the archive command to use `-C /`, extracted into `/tmp/dhcp-migration`, and corrected the copy paths.
- The testing guidance implied the new server could run "in parallel" with the old one on the same production scope or with a "lower priority." DHCP has no general server-priority mechanism in RFC 2131, and coordinated multi-server operation in ISC DHCP is done through an explicit failover configuration. I changed the diagram, step title, guidance text, and takeaway to use an isolated test subnet or a configured failover pair instead.
- The Windows Active Directory authorization step was written as if it always applied. I changed the comment so `Add-DhcpServerInDC` is explicitly scoped to domain-joined DHCP servers that need AD authorization.
- The `journalctl` examples omitted `sudo`. I added it so the log-following and log-check commands work on systems where access to the system journal is restricted to root or privileged groups.

## Review Notes
- ISC DHCP is upstream end-of-life. The corrected Linux steps are still valid for legacy environments that continue to run `isc-dhcp-server`, but new deployments should generally evaluate Kea or current distro guidance.
- The post still assumes a straightforward single-server migration. Environments already using multiple DHCP servers, shared scopes, or more complex relay topologies need additional cutover planning beyond this guide.
