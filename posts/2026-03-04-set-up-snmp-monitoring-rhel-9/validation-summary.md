# Validation Summary: How to Set Up SNMP Monitoring on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Net-SNMP
- SNMPv2c
- systemd
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Monitoring and managing system status and performance, PCP services and tools: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- Red Hat Enterprise Linux 9 documentation: Managing system services with systemctl: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- firewalld documentation: predefined services: https://firewalld.org/documentation/service/
- Net-SNMP snmpd.conf manual: https://www.net-snmp.org/docs/man/snmpd.conf.html
- Net-SNMP snmpd manual: https://www.net-snmp.org/docs/man/snmpd.html
- Net-SNMP VACM/access control reference: https://www.net-snmp.org/wiki/index.php/Vacm

## Issues Found
- The install command included PCP and sysstat packages even though the post is specifically about SNMP monitoring. Changed it to install `net-snmp` and `net-snmp-utils`.
- The service commands enabled `pmcd`, `pmlogger`, and `sysstat` but never enabled the SNMP agent. Changed the service command to enable and start `snmpd`.
- The configuration section listed unrelated PCP, Prometheus, and Grafana configuration paths. Replaced it with a focused `/etc/snmp/snmpd.conf` example using Net-SNMP `rocommunity` directives restricted to localhost and the monitoring server.
- The restart command used a generic placeholder. Changed it to restart `snmpd`.
- The firewall section opened Prometheus, Node Exporter, and Grafana ports, which are unrelated to SNMP. Replaced those with the predefined `snmp` firewalld service.
- The verification commands checked PCP, sysstat, and Prometheus instead of SNMP. Replaced them with an `snmpwalk` check against the local SNMP agent.
- The summary used lowercase "snmp". Changed it to "SNMP".

## Review Notes
SNMPv2c is technically valid with Net-SNMP, but it does not encrypt traffic. A future revision should consider using SNMPv3 with authentication and privacy for production environments.
