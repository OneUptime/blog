# Validation Summary: How to Monitor DHCP Lease Usage with SNMP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SNMP and Net-SNMP `snmpwalk`
- Microsoft DHCP Server `DHCP-MIB`
- ISC DHCP lease files
- Net-SNMP `extend`
- Bash and AWK lease parsing
- Prometheus exporter and alerting rules
- PRTG SNMP custom sensors

## Sources Consulted
- Microsoft Learn: The SNMP Management Information Base (MIB) - https://learn.microsoft.com/en-us/windows/win32/snmp/the-snmp-management-information-base-mib-
- DHCP-MIB reference showing `scopeTableEntry`, `subnetAdd`, `noAddInUse`, `noAddFree`, and `noPendingOffers` OID mappings - https://circitor.fr/Mibs/Html/DHCP-MIB.php
- Net-SNMP `snmpwalk` manual - https://netsnmp.org/man/snmpwalk.html
- Net-SNMP `snmpd.conf` manual for the `extend` directive - https://www.net-snmp.org/docs/man/snmpd.conf.html
- ISC DHCP 4.4 `dhcpd.leases` manual page - https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP Tools page mentioning third-party SNMP pool tracking for ISC DHCP - https://www.isc.org/dhcp-tools/
- Go documentation: installing executables with `go install ...@latest` - https://go.dev/doc/go-get-install-deprecation
- `DRuggeri/dhcpd_leases_exporter` README on Go Packages - https://pkg.go.dev/github.com/DRuggeri/dhcpd_leases_exporter
- Prometheus alerting rules documentation - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Microsoft DHCP OIDs were shifted by one column**: The post listed `.1.1.3` as addresses in use, `.1.1.4` as addresses available, and `.1.1.2` as the subnet address. The DHCP-MIB maps `.1.1.1` to `subnetAdd`, `.1.1.2` to `noAddInUse`, `.1.1.3` to `noAddFree`, and `.1.1.4` to `noPendingOffers`. Fixed the table, `snmpwalk` examples, and key takeaway.
2. **ISC DHCP lease-count script would usually return zero or stale results**: The original `grep -B1 "binding state active"` pipeline assumes the `lease` line is immediately before `binding state active`, but ISC lease blocks normally contain several statements between them. It also did not account for expired leases or later lease declarations for the same IP. Replaced it with an AWK parser that reads whole lease declarations, checks `binding state active`, compares `ends` against the current time, and lets the latest declaration per IP win.
3. **Prometheus exporter name and flags were incorrect**: The post used `github.com/DRuggeri/dhcp_exporter`, `dhcp_exporter`, and `--dhcp.leases-file`, but the published exporter is `github.com/DRuggeri/dhcpd_leases_exporter`, runs as `dhcpd_leases_exporter`, and uses `--dhcpd.leases`. Updated the install and run commands.
4. **Prometheus alert metric did not exist for the referenced exporter**: The post used `dhcp_pool_utilization_percent`, which is not emitted by `dhcpd_leases_exporter`. Replaced it with a calculation using `dhcpd_leases_stats_valid` divided by the configured pool size, and changed the annotation label from nonexistent `subnet` to `instance`.
5. **PRTG alert wording implied a single raw Microsoft OID returns utilization percent**: The Microsoft DHCP MIB exposes counts, not a direct percent-utilization OID. Updated the wording to alert on low free addresses or calculated utilization using `noAddInUse` and `noAddFree`.
6. **Description implied ISC DHCP has native SNMP OIDs**: The metadata described using SNMP OIDs from both Microsoft DHCP Server and ISC DHCP. Updated it to distinguish Microsoft DHCP Server SNMP OIDs from Net-SNMP `extend` scripts used for ISC DHCP.

## Review Notes
- The Net-SNMP `extend` configuration and broad walk of `1.3.6.1.4.1.8072.1.3.2` are technically valid for exposing and inspecting custom script output.
- ISC DHCP is end-of-life upstream, although it is still present in some operating-system packages. Future posts should mention Kea DHCP for new deployments.
- The corrected Prometheus alert is accurate for a single monitored pool or for a lease file whose valid leases correspond to the configured pool size. Multi-pool environments need per-pool parsing, separate recording rules, or a more specialized exporter.
- The embedded shell snippet was checked with `bash -n` and tested against a sample lease file covering active, expired, out-of-subnet, and superseded lease records.
