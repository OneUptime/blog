# Validation Summary: How to Install and Configure Grafana Agent for Metrics Collection on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Grafana Alloy
- Grafana Cloud Metrics
- Grafana Loki
- Prometheus remote write
- systemd

## Sources Consulted
- Grafana Agent static mode documentation: https://grafana.com/docs/agent/latest/static/configuration/
- Grafana Alloy Linux installation documentation: https://grafana.com/docs/alloy/latest/set-up/install/linux/
- Grafana Alloy Linux configuration documentation: https://grafana.com/docs/alloy/latest/configure/linux/
- Grafana Alloy Linux run documentation: https://grafana.com/docs/alloy/latest/set-up/run/linux/
- Grafana Alloy `prometheus.exporter.unix` documentation: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.exporter.unix/
- Grafana Alloy `prometheus.remote_write` documentation: https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/components/prometheus/prometheus.remote_write/
- Grafana Alloy `loki.source.journal` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.journal/
- Red Hat Enterprise Linux 9 package manifest documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/package_manifest/

## Issues Found
- The post installed Grafana Agent v0.39.0, but Grafana Agent reached end-of-life on November 1, 2025. Updated the post to use Grafana Alloy, the supported replacement.
- The installation command used a pinned legacy Grafana Agent RPM from GitHub. Replaced it with Grafana's RPM repository setup and `sudo dnf install -y alloy`, matching the official RHEL/Fedora instructions.
- The configuration used Grafana Agent static-mode YAML. Replaced it with valid Alloy syntax using `prometheus.exporter.unix`, `prometheus.scrape`, `prometheus.remote_write`, `loki.source.journal`, and `loki.write`.
- The post installed a separate `golang-github-prometheus-node_exporter` package. Removed that step because Alloy's `prometheus.exporter.unix` component uses node_exporter internally for Unix host metrics.
- The service commands referenced `grafana-agent` and `node_exporter`. Updated them to use the supported `alloy` systemd service.
- The log collection example tailed `/var/log/messages`, which can fail under the packaged service user without file permissions. Switched the example to `loki.source.journal` and added the documented group membership command for journal access.
- The verification commands checked the old Agent service and Node Exporter port. Updated them to verify the Alloy service and recent Alloy journal output.

## Review Notes
The Alloy configuration snippet was validated with the official `grafana/alloy:latest` container using `alloy validate`. Users still need to replace the example Grafana Cloud metrics and logs URLs with the endpoints for their own Grafana Cloud stack if they are not in the `us-central1` region.
