# Validation Summary: How to Monitor DHCP Server Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ISC DHCP Server (dhcpd)
- systemd journald / journalctl
- rsyslog
- Linux syslog (`/var/log/syslog`)
- Python (regex, collections)
- Windows Server DHCP audit logs
- PowerShell (`Get-DhcpServerv4ScopeStatistics`, `Get-Content`)

## Sources Consulted
- ISC dhcpd man page (`dhcpd.conf(5)`, `dhcpd.leases(5)`): https://www.isc.org/dhcp/
- systemd journalctl man page: https://www.freedesktop.org/software/systemd/man/journalctl.html
- rsyslog configuration documentation: https://www.rsyslog.com/doc/master/configuration/index.html
- Microsoft Learn — DHCP Server audit logging: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-top
- Microsoft Learn — `Get-DhcpServerv4ScopeStatistics`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv4scopestatistics
- Microsoft Learn — `Get-Content`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content
- RFC 2131 (DHCP) for message type names: https://datatracker.ietf.org/doc/html/rfc2131

## Issues Found
No technical issues found.

## Review Notes
- The `isc-dhcp-server` service name is the Debian/Ubuntu convention. On RHEL/CentOS/Fedora the unit is named `dhcpd.service`. The post is implicitly Debian-focused, which is reasonable but worth noting for readers on RHEL-family distros.
- The Python regex `(DHCP\w+) (?:on|for|from) (\d+\.\d+\.\d+\.\d+)` will not match `DHCPDISCOVER` lines, since `DHCPDISCOVER from <MAC>` has no IP after the keyword. This is a known limitation of the snippet (DISCOVER simply will not appear in the summary). Not technically wrong, just incomplete — left as-is to preserve the author's original intent.
- Windows DHCP audit logs are written one per weekday and overwritten the following week (e.g., `DhcpSrvLog-Mon.log`). The "rotated daily" wording in Key Takeaways is accurate at the daily-rotation level, even though the underlying scheme is weekly cyclic overwrite.
- The `log-facility local7;` directive in `dhcpd.conf` requires a corresponding rsyslog rule (which the post correctly provides) plus an rsyslog/dhcpd restart for changes to take effect.
