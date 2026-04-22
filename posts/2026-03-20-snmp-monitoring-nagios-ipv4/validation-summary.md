# Validation Summary: How to Set Up SNMP Monitoring in Nagios for IPv4 Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nagios Core 4
- Monitoring Plugins `check_snmp`
- Net-SNMP SNMPv2c polling
- Ubuntu/Debian package installation
- SNMP MIB-II system and interface objects
- IF-MIB high-capacity interface counters
- BGP4-MIB peer state monitoring

## Sources Consulted
- Nagios Core object definitions documentation for host, service, command, contact, and contact group directives: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/objectdefinitions.html
- Nagios Core check scheduling documentation for `check_interval`, `retry_interval`, and `max_check_attempts`: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/checkscheduling.html
- Monitoring Plugins `check_snmp` manual page for supported options such as `-P`, `-C`, `-o`, `-s`, `-w`, `-c`, `-l`, `-u`, and `-e`: https://www.monitoring-plugins.org/doc/man/check_snmp.html
- Monitoring Plugins 2.3.5 `check_snmp` source for Ubuntu-packaged behavior including default SNMPv1, numeric OID MIB handling, `--rate`, and `--rate-multiplier`: https://raw.githubusercontent.com/monitoring-plugins/monitoring-plugins/v2.3.5/plugins/check_snmp.c
- Ubuntu Launchpad package page for `monitoring-plugins` in Ubuntu 24.04 Noble: https://launchpad.net/ubuntu/noble/+package/monitoring-plugins
- Ubuntu package page for `nagios4` in Ubuntu 24.04 Noble: https://packages.ubuntu.com/noble/nagios4
- Ubuntu package page for `snmp-mibs-downloader` in Ubuntu 24.04 Noble: https://packages.ubuntu.com/noble/snmp-mibs-downloader
- RFC 1213 for `sysDescr`, `sysUpTime`, `ifOperStatus`, `ifInOctets`, and `ifOutOctets`: https://datatracker.ietf.org/doc/html/rfc1213
- RFC 2863 for IF-MIB high-capacity counters such as `ifHCInOctets` and `ifHCOutOctets`: https://datatracker.ietf.org/doc/html/rfc2863
- RFC 4273 for BGP4-MIB `bgpPeerState` and the `established(6)` value: https://datatracker.ietf.org/doc/html/rfc4273
- Local verification with Ubuntu `monitoring-plugins-standard` 2.3.5 `check_snmp --help` and Nagios Core 4.4.6 `nagios4 -v` against the corrected snippets.

## Issues Found
1. **Outdated package name and unnecessary development package**: The install command used `nagios-plugins` and installed `libsnmp-dev` for runtime use. Updated the command to install `monitoring-plugins`, the current Ubuntu/Debian package name, and removed `libsnmp-dev` because it is not needed to run the packaged plugin.

2. **Undefined default contact target**: The host example used `contacts netops-team`, but the Ubuntu/Debian sample configuration defines the `admins` contact group by default. Changed the host definition to `contact_groups admins` so the example validates on a default package installation.

3. **Invalid uptime thresholds**: The uptime check used `-w 0 -c 0`, which would alert for normal positive uptime values. Removed the thresholds and left the check as an existence/value retrieval check with a label.

4. **Misuse of `check_snmp -e`**: The interface and BGP examples used `-e` as if it meant expected value. In `check_snmp`, `-e` is the retries option. Replaced those checks with `-s 1` for interface-up status and `-s 6` for BGP established state.

5. **SNMP version not specified**: `check_snmp` defaults to SNMPv1 in the Ubuntu-packaged Monitoring Plugins 2.3.5 source. Added `-P 2c` to the SNMPv2c examples, which is required for Counter64 high-capacity interface counters.

6. **Symbolic OIDs depended on local MIB loading**: Replaced symbolic OIDs with numeric OIDs for `sysUpTime`, `sysDescr`, `ifOperStatus`, `ifHCInOctets`, `ifHCOutOctets`, and `bgpPeerState` so the checks work even when Net-SNMP MIB loading is disabled.

7. **Raw interface counter treated as utilization**: The original utilization example compared absolute `ifInOctets` counter values to thresholds. Changed it to use `ifHCInOctets` with `--rate` and `--rate-multiplier 8`, so thresholds apply to bits per second.

8. **Bandwidth shortcut used 32-bit counters and no bit conversion**: Updated the custom bandwidth command to use `ifHCInOctets` and `ifHCOutOctets`, force SNMPv2c, and multiply the rate by 8 to report bits per second.

9. **Duplicate `check_snmp` command definition**: Ubuntu/Debian Nagios package defaults already include a base `check_snmp` command. Removed the duplicate command definition and kept only the uniquely named `check_snmp_bandwidth` shortcut.

10. **Incorrect BGP label option usage**: The BGP check used both `-l` and `--label`, where `--label` is just the long form of `-l`. Removed the duplicate label option and made the expected value explicit through `-s 6`.

## Review Notes
- The corrected Nagios host, service, and command snippets were validated with `nagios4 -v` using Nagios Core 4.4.6 package defaults in a temporary configuration.
- The current upstream web manpage for `check_snmp` tracks 2.4git and does not list `--rate`, but the Ubuntu 24.04 `monitoring-plugins-standard` 2.3.5 package targeted by the post does include `--rate` and `--rate-multiplier`.
- `snmp-mibs-downloader` is in Ubuntu multiverse; users may need that repository enabled before installing it.
