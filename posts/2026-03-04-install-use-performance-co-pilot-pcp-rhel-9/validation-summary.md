# Validation Summary: How to Install and Use Performance Co-Pilot (PCP) on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Performance Co-Pilot (PCP)
- systemd
- firewalld
- sysstat

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Installing and enabling PCP": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/monitoring_and_managing_system_status_and_performance/optimizing-virtual-machine-performance-in-rhel_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Logging performance data with pmlogger": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/logging-performance-data-with-pmlogger_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Monitoring performance with Performance Co-Pilot": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/monitoring-performance-with-performance-co-pilot_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Setting up graphical representation of PCP metrics": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-up-graphical-representation-of-pcp-metrics_monitoring-and-managing-system-status-and-performance
- pmstat(1) Linux manual page: https://man7.org/linux/man-pages/man1/pmstat.1.html

## Issues Found
- The package installation command included `net-snmp` and `net-snmp-utils`, but the guide did not configure or start SNMP services. Removed those packages so the install step matches the PCP and sysstat workflow.
- The configuration examples listed Prometheus, Grafana, and SNMP configuration files even though the guide does not install or configure those tools. Replaced them with the PCP `pmlogger` configuration file and `pmcd` listener options documented for RHEL 9.
- The generic restart command used `<service-name>`, which is not directly executable. Replaced it with `sudo systemctl restart pmcd pmlogger`.
- The firewall commands opened Prometheus, Node Exporter, Grafana, and SNMP ports without installing those services. Replaced them with TCP `44321`, the documented PMCD port for remote PCP collection.
- The verification section queried a Prometheus endpoint even though Prometheus was not installed or configured. Replaced it with the `pcp` command, which Red Hat documents for verifying PCP service status.

## Review Notes
The remaining sysstat commands are valid for collecting and checking `sar` data on RHEL-style systems. The optional alerting paragraph is still broad, but it is framed as depending on the monitoring stack rather than as part of the PCP installation path.
