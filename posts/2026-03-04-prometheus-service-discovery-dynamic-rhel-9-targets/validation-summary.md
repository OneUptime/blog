# Validation Summary: How to Configure Prometheus Service Discovery for Dynamic RHEL Targets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Prometheus
- Prometheus file-based service discovery
- Performance Co-Pilot (PCP)
- sysstat / sar
- firewalld
- SNMP / Net-SNMP
- Grafana
- Node Exporter

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus getting started documentation: https://prometheus.io/docs/tutorials/getting_started/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Red Hat Enterprise Linux 9 PCP pmlogger documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/logging-performance-data-with-pmlogger_monitoring-and-managing-system-status-and-performance
- Red Hat Customer Portal sysstat / SAR documentation: https://access.redhat.com/solutions/276533
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- Local `systemctl --help` output

## Issues Found
- The post described Prometheus service discovery in the title and description but did not include a Prometheus service discovery configuration. Added a minimal `file_sd_configs` scrape job and an example target file using Prometheus' documented YAML format for file-based service discovery.
- The sysstat activation command only enabled `sysstat`. On RHEL 8 and 9, SAR collection uses systemd timers, so the command now includes `sysstat-collect.timer` and `sysstat-summary.timer`.
- The Prometheus API verification URL was unquoted. Quoted it to avoid shell interpretation issues and match common curl usage for query URLs.

## Review Notes
The guide remains high-level and assumes Prometheus, Grafana, and Node Exporter packages or services are already available from the user's chosen repositories or installation method. Future improvements could add installation details for those components, but the reviewed commands and configuration examples are now technically aligned with the stated Prometheus service discovery topic.
