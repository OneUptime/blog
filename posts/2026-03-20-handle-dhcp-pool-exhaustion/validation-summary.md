# Validation Summary: How to Handle DHCP Pool Exhaustion

## Status
validated

## Post Type
Guide

## Technologies Covered
- ISC DHCP (`dhcpd`, `dhcpd.conf`, `dhcpd.leases`)
- Microsoft DHCP Server PowerShell
- Python 3 (`re`, `datetime`, `ipaddress`)
- Bash
- Syslog (`logger`)
- DHCP / RFC 2131

## Sources Consulted
- ISC DHCP 4.4 `dhcpd.leases` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP 4.4 `dhcpd` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP 4.1 `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhcpdconf
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- Microsoft Learn, `Get-DhcpServerv4ScopeStatistics`: https://learn.microsoft.com/powershell/module/dhcpserver/get-dhcpserverv4scopestatistics
- Python standard library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Red Hat Enterprise Linux 9, lease database notes for `dhcpd`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- Local CLI help: `grep --help`
- Local CLI help: `logger --help`

## Issues Found
- The original lease-counting snippets used `grep -c "binding state active"` against `dhcpd.leases`. ISC documents that the file is append-only and that only the last declaration for a lease is current, so the original snippets could overcount historical records. I replaced them with snippets that evaluate only the current record per IP and count only unexpired active leases.
- The original stale-lease script did not do what its comment said. It did not check "not renewed in > 7 days," it ignored the append-only/current-record behavior, and it only matched one timestamp format. I changed the section into a lease-record review step, made it parse only the current record per IP, and added support for both documented `ends` formats.
- The address totals in the scope expansion example were off by one. `.50` to `.200` is 151 addresses, and `.50` to `.240` is 191 addresses. I corrected those counts and aligned the monitoring pool size to `151`.
- The `/23` example comment was imprecise. I updated it to the exact count for the shown range: 457 addresses.
- The subnetting guidance implied that splitting a subnet solves exhaustion by itself. I adjusted the wording to clarify that VLAN/scope redistribution can spread clients across scopes, but does not increase total address space on its own.
- The example log message was made more accurate by using the common `network ...: no free leases` format and softer wording (`may include`).

## Review Notes
- The post uses ISC DHCP examples. ISC DHCP is end-of-life; the syntax remains valid for existing deployments, but new deployments typically use Kea.
- Lease database paths vary by distribution: Debian/Ubuntu commonly use `/var/lib/dhcp/dhcpd.leases`, while Red Hat-family systems commonly use `/var/lib/dhcpd/dhcpd.leases`.
- Red Hat documents that manually updating the lease database can corrupt it, so lease cleanup should be treated as a maintenance-window task and done with vendor-documented procedures.
- Revised Python snippets were sanity-checked locally against sample lease data.
