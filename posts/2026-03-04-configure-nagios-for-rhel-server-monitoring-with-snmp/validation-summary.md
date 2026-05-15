# Validation Summary: How to Configure Nagios for RHEL Server Monitoring with SNMP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Nagios Core
- Nagios Plugins
- Net-SNMP
- SNMP MIB OIDs

## Sources Consulted
- Nagios Plugins official download page: https://www.nagios.org/downloads/nagios-plugins/
- Nagios Plugins official source installation guide: https://library.nagios.com/docs/nagios-plugins/getting-started/Nagios-Plugins-Installing-Nagios-Plugins-From-Source
- Monitoring Plugins check_snmp manual: https://www.monitoring-plugins.org/doc/man/check_snmp.html
- Nagios Core object configuration documentation: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/configobject.html
- Nagios Core main configuration documentation: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/configmain.html
- Net-SNMP UCD-SNMP-MIB reference: https://www.net-snmp.org/docs/mibs/ucdavis.html
- Red Hat Enterprise Linux Net-SNMP documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-system_monitoring_tools
- IETF RFC 1213 / IF-MIB reference for ifOperStatus: https://www.rfc-editor.org/rfc/rfc1213
- IETF RFC 3418 / SNMPv2-MIB reference for sysUpTime: https://www.rfc-editor.org/rfc/rfc3418

## Issues Found
- The plugin installation example used Nagios Plugins 2.4.8, which is no longer the current official release as of 2026-05-15. Updated the download URL, archive name, and directory to Nagios Plugins 2.5 from the official Nagios Plugins download page.
- The build prerequisites were incomplete for a source build on a RHEL-family Nagios server. Added common compiler, autotools, OpenSSL, Net-SNMP, and wget prerequisites used by the official Nagios Plugins source installation guidance.
- The memory check queried available and total RAM but had no warning or critical thresholds, so it would not alert on low memory. Changed it to check available RAM with lower-bound warning and critical thresholds and updated the service example accordingly.
- The post description said it checked network interfaces, and a command template was present, but no interface service was defined. Added an interface status service example using the existing SNMP interface command.

## Review Notes
- The disk check uses UCD-SNMP-MIB dskPercent index 1, which is valid only when the target agent's snmpd.conf exposes a matching dskTable row. In real deployments, confirm the disk row index with snmpwalk before reusing the example unchanged.
- SNMPv1/v2c community strings are shown for simplicity. For sensitive environments, SNMPv3 should be preferred.
