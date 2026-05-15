# Validation Summary: How to Create Custom Grafana Dashboards for RHEL 9 System Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Performance Co-Pilot (PCP)
- Grafana
- sysstat
- Net-SNMP
- Prometheus
- Prometheus Node Exporter
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up PCP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-up-pcp_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Setting up graphical representation of PCP metrics: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-up-graphical-representation-of-pcp-metrics_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Overview of performance monitoring options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/overview-of-performance-monitoring-options
- Grafana documentation: Start the Grafana server: https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/
- Prometheus documentation: HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus documentation: Monitoring Linux host metrics with the Node Exporter: https://prometheus.io/docs/guides/node-exporter/
- Prometheus documentation: Prometheus command-line reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- firewalld documentation: firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd
- PCP pmstat manual page: https://man7.org/linux/man-pages/man1/pmstat.1.html

## Issues Found
- The package installation command did not install Grafana or the Grafana PCP plugin, even though the post is about Grafana dashboards for RHEL 9 metrics. I added `pcp-zeroconf`, `grafana`, and `grafana-pcp`, matching Red Hat's documented PCP/Grafana setup.
- The service startup command did not start or enable Grafana. I added `grafana-server` and `pmproxy`, because Red Hat documents `grafana-server` as the Grafana backend service and the Grafana PCP plugin uses `pmproxy` on the backend.
- The firewall example opened raw TCP port `3000` for Grafana. I changed it to `--add-service=grafana`, which is the documented RHEL/firewalld approach for opening Grafana service traffic.

## Review Notes
The remaining commands are syntactically valid for the tools discussed. The post remains a high-level setup guide; a future improvement would be to add actual Grafana data source and dashboard creation steps, but that was outside this validation pass because the requested edits were limited to technical corrections.
