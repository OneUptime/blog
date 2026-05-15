# Validation Summary: How to Set Up a Complete Monitoring Stack with Prometheus and Grafana on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- Prometheus
- Prometheus Node Exporter
- Prometheus Alertmanager
- Grafana
- systemd
- firewalld

## Sources Consulted
- Prometheus download page: https://prometheus.io/download/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager overview: https://prometheus.io/docs/alerting/latest/alertmanager/
- Grafana RHEL/Fedora installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/redhat-rhel-fedora/
- Grafana start/restart documentation: https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/

## Issues Found
- The post configured Prometheus to send alerts to Alertmanager on `localhost:9093`, but did not install or configure Alertmanager. Added Alertmanager installation, a minimal valid Alertmanager configuration, a systemd service, firewall access for port `9093`, and a readiness check.
- The post referenced `alert_rules.yml` in `prometheus.yml`, but never created the file. Added a minimal valid `InstanceDown` alerting rule file and ownership command so Prometheus can load the configured rules.
- The post pinned older Prometheus and Node Exporter releases. Updated Prometheus to `3.11.3` and Node Exporter to `1.11.1`, matching the latest official Prometheus download page as of this review.
- The Prometheus 2.x console template copy commands were no longer valid for the current Prometheus `3.11.3` Linux tarball, which ships the binaries and default config but not `consoles` or `console_libraries` directories. Removed those copy commands and the matching systemd flags.
- The conclusion described Prometheus as providing "long-term storage." Since the tutorial configures only local TSDB retention for 30 days and no remote storage system, changed this to "30-day local metrics retention."

## Review Notes
- The Grafana repository configuration and `grafana-server` service commands match the current Grafana RHEL/Fedora documentation.
- The Prometheus and Alertmanager YAML snippets were validated with `promtool check config` from Prometheus `3.11.3` and `amtool check-config` from Alertmanager `0.32.1`.
- The sample Alertmanager receiver is intentionally minimal. For production use, readers should configure a real notification receiver such as email, Slack, PagerDuty, or another supported integration.
