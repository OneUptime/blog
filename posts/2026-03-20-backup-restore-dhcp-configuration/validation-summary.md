# Validation Summary: How to Back Up and Restore DHCP Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- ISC DHCP (`dhcpd`) on Debian/Ubuntu Linux
- Bash scripting
- `cron`
- Windows Server DHCP PowerShell cmdlets

## Sources Consulted
- ISC DHCP 4.4 `dhcpd` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP 4.4 `dhcpd.leases` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdleases
- Debian `dhcpd(8)` manpage for the `isc-dhcp-server` package: https://manpages.debian.org/unstable/isc-dhcp-server/dhcpd.8.en.html
- Microsoft Learn `Export-DhcpServer`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/export-dhcpserver?view=windowsserver2025-ps
- Microsoft Learn `Import-DhcpServer`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/import-dhcpserver?view=windowsserver2025-ps
- ISC DHCP end-of-life notice: https://www.isc.org/blogs/isc-dhcp-eol/

## Issues Found
- The Linux section was labeled too broadly. The example uses Debian/Ubuntu-specific package and service names such as `isc-dhcp-server` and `/etc/default/isc-dhcp-server`, so I narrowed the section heading to Debian/Ubuntu ISC `dhcpd`.
- The `dhcpd.leases~` row implied a required backup file. ISC documents it as the previous lease database created during lease-file rewrites, so I marked it as optional to match how the backup script actually works.
- The backup script suppressed `tar` errors and always printed a success message. I removed the stderr suppression and added an explicit failure check so the script exits if the archive is not created successfully.
- The restore script did not check whether archive extraction succeeded before continuing. I added error handling around `tar xzf` and kept configuration validation gated on successful extraction.
- The Windows restore example said it worked on the same or a new server, but the import command omitted `-ScopeOverwrite`. Microsoft documents that overwrite behavior separately, so I added `-ScopeOverwrite` to make restores onto an existing server technically correct.

## Review Notes
- ISC DHCP is end-of-life as of 2022 and Debian now marks `isc-dhcp-server` deprecated. The post is still technically usable for legacy environments, but it should remain understood as guidance for legacy ISC DHCP deployments rather than new DHCP installations.
- `dhcpd -t` validates configuration syntax only. ISC also documents `dhcpd -T` for lease-file syntax testing if a future revision wants stronger restore validation.
