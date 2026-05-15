# Validation Summary: How to Monitor Podman Containers with Prometheus on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- prometheus-podman-exporter
- Prometheus
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Monitoring and managing system status and performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- containers/prometheus-podman-exporter README: https://github.com/containers/prometheus-podman-exporter
- containers/prometheus-podman-exporter installation guide: https://github.com/containers/prometheus-podman-exporter/blob/main/install.md
- containers/prometheus-podman-exporter packaged systemd unit and sysconfig: https://github.com/containers/prometheus-podman-exporter/tree/main/contrib/systemd
- Performance Co-Pilot pmdapodman manual page: https://man7.org/linux/man-pages/man1/pmdapodman.1.html

## Issues Found
- The original post claimed to monitor Podman containers with Prometheus but installed generic PCP, sysstat, and SNMP packages. I changed the package installation to `podman` and `prometheus-podman-exporter`, which is the Podman-specific Prometheus exporter.
- The original service commands enabled `pmcd`, `pmlogger`, and `sysstat`, which do not create a Prometheus scrape endpoint for Podman container metrics. I changed the service command to enable and start `prometheus-podman-exporter`.
- The original configuration section listed several unrelated configuration locations without a Prometheus scrape target. I replaced it with a valid Prometheus `scrape_configs` example for the exporter on port `9882`.
- The firewall section opened Node Exporter, Grafana, and SNMP ports that were not used by the guide. I changed it to open the Podman exporter port `9882` and kept Prometheus port `9090`.
- The verification section checked PCP, sysstat, and a generic Prometheus `up` query. I changed it to check the Podman exporter `/metrics` endpoint and a Prometheus `up{job="podman"}` query.
- The alerting section referenced Nagios even though the guide is Prometheus-focused. I narrowed it to Prometheus Alertmanager and Red Hat Insights.
- The prerequisites did not mention that the packaged Podman exporter requires EPEL on RHEL 9. I added that requirement and clarified that a Prometheus server must be available to scrape the host.

## Review Notes
The exporter exposes metrics over plain HTTP by default. For production deployments, use network controls or the exporter's `--web.config.file` option to add TLS and/or authentication where required.
