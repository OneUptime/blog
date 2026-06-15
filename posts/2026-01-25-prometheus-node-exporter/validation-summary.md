# Validation Summary: How to Configure Node Exporter for Prometheus

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Prometheus
- Prometheus Node Exporter
- PromQL
- Prometheus scrape configuration
- Prometheus alerting and recording rules
- systemd
- Docker
- Kubernetes DaemonSet and Service manifests
- TLS and basic authentication with exporter-toolkit web configuration

## Sources Consulted
- Prometheus Node Exporter README and collector documentation: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter releases: https://github.com/prometheus/node_exporter/releases
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus PromQL operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus HTTPS and authentication documentation: https://prometheus.io/docs/prometheus/latest/configuration/https/
- Prometheus exporter-toolkit web configuration documentation: https://github.com/prometheus/exporter-toolkit/blob/master/docs/web-configuration.md

## Issues Found
- The binary installation section described the download as the latest release but used Node Exporter v1.7.0. Updated the download, extraction, and install paths to v1.11.1, the latest release listed in the official GitHub releases at review time.
- The systemd service creation command used `sudo cat > /etc/systemd/system/node_exporter.service`, which does not apply sudo privileges to the shell redirection. Replaced it with `sudo tee ... > /dev/null << EOF`.
- The "Enable only specific collectors" example listed collectors but did not disable default collectors. Added `--collector.disable-defaults`, matching the official Node Exporter collector documentation.
- The load-per-CPU PromQL examples used `count by (instance)`, which can drop labels such as `job` and prevent default vector matching with `node_load1` or `node_load15`. Replaced those with `count without (cpu, mode)` so the remaining target labels are preserved.
- The swap usage alert could fire incorrectly on hosts with no swap because division by zero can produce infinite values. Added a `node_memory_SwapTotal_bytes > 0` filter to the swap usage examples.
- The disk metric comment described a weighted I/O expression as "wait time". Renamed the comment to "Disk average queue size while busy" to better match the metric semantics.

## Review Notes
- Verified the Node Exporter CLI flags in the current `quay.io/prometheus/node-exporter:latest` container.
- Extracted the Prometheus scrape config, alerting rules, and recording rules from the post and validated them with `promtool check config` and `promtool check rules` from the official Prometheus container image.
