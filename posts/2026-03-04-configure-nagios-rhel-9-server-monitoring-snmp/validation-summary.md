# Validation Summary: How to Configure Nagios for RHEL 9 Server Monitoring with SNMP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nagios Core / Nagios XI
- Nagios Plugins `check_snmp`
- Net-SNMP / SNMPv3
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systemd services with `systemctl enable --now` in "Configuring basic system settings": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/
- Red Hat Enterprise Linux documentation for Net-SNMP service behavior and `snmpd`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/
- Red Hat Enterprise Linux 9 documentation for performance and monitoring packages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/
- firewalld documentation for permanent services and predefined services: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- IANA Service Name and Transport Protocol Port Number Registry for SNMP UDP port 161: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
- Nagios Plugins official `check_snmp` documentation: https://nagios-plugins.org/doc/man/check_snmp.html
- Nagios Core documentation for SNMP monitoring and service checks: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/monitoring-routers.html
- Net-SNMP documentation for `snmpd.conf`, SNMPv3 users, and read-only user configuration: https://www.net-snmp.org/tutorial/tutorial-5/demon/snmpd.html

## Issues Found
- The original package installation focused on PCP and sysstat and did not install or configure the SNMP agent needed for Nagios SNMP checks. I changed the package list to `net-snmp` and `net-snmp-utils`.
- The original service commands enabled `pmcd`, `pmlogger`, and `sysstat`, which do not configure SNMP monitoring for Nagios. I changed the service command to enable and start `snmpd.service`.
- The original configuration step listed unrelated Prometheus, Grafana, and PCP paths instead of showing SNMP and Nagios configuration. I replaced it with SNMPv3 user creation and a Nagios `check_snmp` command/service definition.
- The original firewall section opened Prometheus, Node Exporter, and Grafana ports, which were unrelated to Nagios polling SNMP on RHEL. I limited the firewall change to the predefined `snmp` service.
- The original verification commands checked PCP, sysstat, and Prometheus instead of SNMP/Nagios. I replaced them with `snmpwalk` and `check_snmp` verification commands.
- The alerting note mentioned Prometheus Alertmanager even though the post is about Nagios SNMP monitoring. I changed it to Nagios notifications and numeric SNMP thresholds.

## Review Notes
The corrected post uses SNMPv3 instead of SNMPv1/v2c because authenticated and encrypted SNMP is the safer default for server monitoring. The exact OIDs and thresholds should be expanded in a future post based on what the RHEL host needs to expose and what Nagios should alert on.
