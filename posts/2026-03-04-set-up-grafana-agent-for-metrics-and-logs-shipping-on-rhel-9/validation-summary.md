# Validation Summary: How to Set Up Grafana Agent for Metrics and Logs Shipping on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Grafana Alloy
- Grafana Agent
- Prometheus remote write
- Loki log shipping
- systemd
- RPM/DNF package management

## Sources Consulted
- Grafana Agent documentation: https://grafana.com/docs/agent/latest/
- Grafana Alloy Linux installation documentation: https://grafana.com/docs/alloy/latest/set-up/install/linux/
- Grafana Alloy Linux run documentation: https://grafana.com/docs/alloy/latest/set-up/run/linux/
- Grafana Alloy Linux configuration documentation: https://grafana.com/docs/alloy/latest/configure/linux/
- Grafana Alloy Linux monitoring example: https://grafana.com/docs/alloy/latest/monitor/monitor-linux/
- Grafana Alloy prometheus.remote_write component documentation: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.remote_write/
- Grafana Alloy local.file_match component documentation: https://grafana.com/docs/alloy/latest/reference/components/local/local.file_match/

## Issues Found
- The post used Grafana Agent as the recommended collector, but Grafana Agent reached end-of-life on November 1, 2025. Updated the post to use Grafana Alloy, the recommended successor.
- The original post skipped installation and used placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>`. Replaced them with the official Grafana RPM repository setup, `sudo dnf install alloy`, `/etc/alloy/config.alloy`, the `alloy` systemd service, and `rpm -qa | grep alloy`.
- The original configuration guidance was generic and did not show a valid metrics or logs pipeline. Added a concise Alloy configuration that scrapes Linux host metrics with `prometheus.exporter.unix`, forwards metrics with `prometheus.remote_write`, discovers RHEL log files with `local.file_match`, and ships logs with `loki.source.file` and `loki.write`.
- The post said data could be shipped to "self-hosted Grafana instances", which is imprecise because Grafana visualizes data while metrics and logs are stored by backends such as Prometheus-compatible remote write receivers and Loki. Updated the wording accordingly.
- The service verification and troubleshooting commands omitted `sudo` for journal access and used placeholders. Updated the commands to use `sudo systemctl status alloy` and `sudo journalctl -u alloy`.

## Review Notes
Grafana Cloud users must replace the example Prometheus remote write and Loki URLs with the endpoints and authentication settings provided by their Grafana Cloud account. The article is now technically accurate as a short RHEL 9 Alloy setup guide, but a future improvement would be to add a dedicated Grafana Cloud authentication example.
