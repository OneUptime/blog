# Validation Summary: How to Monitor RHEL with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Prometheus
- Prometheus Node Exporter
- Prometheus Alertmanager
- Grafana
- PromQL
- systemd
- firewalld

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus command-line flags documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus Node Exporter GitHub releases and README: https://github.com/prometheus/node_exporter
- Prometheus Alertmanager overview and configuration documentation: https://prometheus.io/docs/alerting/latest/alertmanager/ and https://prometheus.io/docs/alerting/latest/configuration/
- Grafana RPM installation documentation: https://grafana.com/docs/grafana/latest/installation/rpm/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/dashboards/export-import/
- firewalld firewall-cmd documentation: https://firewalld.org/documentation/man-pages/firewall-cmd
- systemd.service documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The post configured Prometheus to send alerts to `localhost:9093` and showed Alertmanager in the architecture, but it did not install, configure, or start Alertmanager. Added Alertmanager installation, a minimal valid Alertmanager configuration, a systemd service, firewall access for port 9093, and a troubleshooting API check.
- The post used older Prometheus and Node Exporter versions. Updated Prometheus from `2.51.0` to `3.11.3` and Node Exporter from `1.7.0` to `1.11.1`, matching the latest upstream GitHub releases available during review.

## Review Notes
The Prometheus rule file, Prometheus configuration, and Alertmanager configuration were validated with `promtool` 3.11.3 and `amtool` 0.32.1. The Grafana panel PromQL examples were parsed with `promtool --experimental promql format`. The Node Exporter service flags were checked against Node Exporter 1.11.1 help output.
