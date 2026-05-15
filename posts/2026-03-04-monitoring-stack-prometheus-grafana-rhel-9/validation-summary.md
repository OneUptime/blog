# Validation Summary: How to Set Up a Complete Monitoring Stack with Prometheus and Grafana on RHEL 9

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Performance Co-Pilot (PCP)
- sysstat and sar
- Net-SNMP
- Prometheus
- Prometheus Node Exporter
- Grafana
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Monitoring and managing system status and performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/monitoring_and_managing_system_status_and_performance/
- Red Hat documentation for PCP pmlogger service enablement: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/logging-performance-data-with-pmlogger_monitoring-and-managing-system-status-and-performance
- Red Hat documentation for setting up Grafana with PCP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/monitoring_and_managing_system_status_and_performance/monitoring-performance-by-using-the-metrics-rhel-system-role_monitoring-and-managing-system-status-and-performance
- Red Hat Customer Portal note on sysstat timers in RHEL 8 and 9: https://access.redhat.com/solutions/276533
- Prometheus official installation documentation: https://prometheus.io/docs/prometheus/latest/installation/
- Prometheus official getting started documentation: https://prometheus.io/docs/tutorials/getting_started/
- Prometheus official configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana official RHEL/Fedora installation documentation: https://grafana.com/docs/grafana/latest/installation/rpm/
- Grafana official start/restart documentation: https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/
- Grafana official configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- firewalld official firewall-cmd documentation: https://firewalld.org/documentation/utilities/firewall-cmd.html

## Issues Found
- The post described a "complete" Prometheus and Grafana stack, but the install command did not install Grafana and did not explain that Prometheus and Node Exporter must be installed separately. I changed the wording to "basic" and added the RHEL Grafana/PCP packages plus a note to install Prometheus and Node Exporter from official release binaries or an approved repository.
- The sysstat startup command only enabled `sysstat`. On RHEL 8 and 9, sysstat collection uses systemd timers. I updated the command to enable `sysstat`, `sysstat-collect.timer`, and `sysstat-summary.timer`.
- The Grafana service was not enabled or started, even though the guide referenced Grafana. I added `systemctl enable --now grafana-server`.
- The Prometheus configuration path was presented as unconditional. I qualified it as applying when Prometheus is installed with that configuration path, because official Prometheus binaries use the `--config.file` flag and package layouts vary.
- The firewall example opened Grafana by raw port. RHEL documentation uses the `grafana` firewalld service for Grafana traffic, so I changed that command to `--add-service=grafana`.
- The summary repeated the misleading "complete monitoring stack" phrasing and had lowercase product names. I updated it to match the corrected scope and capitalization.

## Review Notes
The post remains a high-level setup guide. A future improvement would be to add a concrete Prometheus and Node Exporter installation path, because official Prometheus documentation supports release binaries and containers, while RHEL package availability depends on configured repositories.
