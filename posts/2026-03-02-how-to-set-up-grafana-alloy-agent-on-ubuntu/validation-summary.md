# Validation Summary: How to Set Up Grafana Alloy (Agent) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Alloy (telemetry collector)
- Alloy configuration syntax (formerly River)
- Prometheus / `prometheus.remote_write` / `prometheus.scrape`
- `prometheus.exporter.unix` (built-in node exporter)
- Loki / `loki.source.file` / `loki.write` / `loki.process`
- OpenTelemetry / OTLP (`otelcol.receiver.otlp`, `otelcol.exporter.*`)
- Tempo (traces backend)
- systemd service management on Ubuntu
- APT package management

## Sources Consulted
- Grafana Alloy official docs: https://grafana.com/docs/alloy/latest/
- Alloy installation guide for Linux: https://grafana.com/docs/alloy/latest/set-up/install/linux/
- Alloy component reference (prometheus.*, loki.*, otelcol.*, local.file_match): https://grafana.com/docs/alloy/latest/reference/components/
- Alloy CLI reference (`alloy run`, `alloy fmt`): https://grafana.com/docs/alloy/latest/reference/cli/
- Prometheus node_exporter collector list: https://github.com/prometheus/node_exporter

## Issues Found
No technical issues found.

The component names, argument names, configuration patterns, CLI commands, install steps (apt.grafana.com GPG key + repo), config path (`/etc/alloy/config.alloy`), default UI port (12345), and SIGHUP-based reload behavior all match the current Alloy documentation.

## Review Notes
- `otelcol.exporter.loki` still exists and works, but Grafana now recommends pushing OTel logs to Loki's native OTLP endpoint via `otelcol.exporter.otlphttp` in newer Alloy releases. The example in the post is still valid today but may be deprecated in future versions.
- The `otelcol.exporter.otlp "tempo"` example sends to `tempo.example.com:4317` without an explicit `tls` block. This works for endpoints that accept TLS by default (e.g., Grafana Cloud Tempo); for plaintext/local endpoints a `tls { insecure = true }` block would be required. The example as written is fine for the typical cloud-Tempo use case implied by the hostname.
- Ubuntu 20.04 reaches standard support EOL in April 2025; readers on newer Ubuntu releases (24.04 LTS) will also find these instructions work since the apt.grafana.com repo serves a single `stable` channel for all supported Debian/Ubuntu releases.
- Setting `instance` as a target label in `prometheus.scrape` overrides Alloy's default of using `__address__` for instance — this is intentional in the example and is a valid pattern.
