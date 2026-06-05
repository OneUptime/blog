# Validation Summary: How to Use Grafana Alloy as an OpenTelemetry Collector Alternative

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana Alloy
- OpenTelemetry Collector
- OTLP and OTLP/HTTP
- Prometheus scraping and remote write
- Grafana Mimir, Loki, Tempo, and Pyroscope
- Kubernetes discovery and Helm deployment
- Docker

## Sources Consulted
- Grafana Alloy Linux installation documentation: https://grafana.com/docs/alloy/latest/set-up/install/linux/
- Grafana Alloy Docker installation documentation: https://grafana.com/docs/alloy/latest/set-up/install/docker/
- Grafana Alloy Kubernetes deployment documentation: https://grafana.com/docs/alloy/latest/set-up/install/kubernetes/
- Grafana Alloy `otelcol.receiver.otlp` reference: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.receiver.otlp/
- Grafana Alloy `otelcol.exporter.otlphttp` reference: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlphttp/
- Grafana Alloy `otelcol.receiver.prometheus` reference: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.receiver.prometheus/
- Grafana Alloy `prometheus.scrape` reference: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.scrape/
- Grafana Alloy `prometheus.remote_write` reference: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.remote_write/
- Grafana Alloy `discovery.relabel` reference: https://grafana.com/docs/alloy/latest/reference/components/discovery/discovery.relabel/
- Grafana Alloy `sys.env` standard library reference: https://grafana.com/docs/alloy/latest/reference/stdlib/sys/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector extensions documentation: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector troubleshooting documentation for zPages: https://opentelemetry.io/docs/collector/troubleshooting/

## Issues Found
- The Debian/Ubuntu install snippet used an older Grafana GPG key URL and dearmored key path. Updated it to the current official `gpg-full.key` and `/etc/apt/keyrings/grafana.asc` commands.
- The Docker command published port `12345` but did not pass `--server.http.listen-addr=0.0.0.0:12345`, so the Alloy UI would not be reachable from the host. Added the official listen-address flag and `--storage.path`.
- The Prometheus scraping section said the example exported metrics as OTLP, but the snippet used `prometheus.remote_write`. Updated the description to say Prometheus remote write.
- The Kubernetes pod relabeling example replaced `__address__` with only the annotated port, which would not produce a valid scrape address. Updated it to combine pod IP and annotated port into `pod_ip:port`.
- The Kubernetes DaemonSet example used `env("ONEUPTIME_TOKEN")`, but Alloy's standard library uses `sys.env`. Updated the function call.

## Review Notes
Validated the main Alloy configuration snippets with `grafana/alloy:latest`, which resolved locally to Alloy v1.16.1. The comparison table is broadly accurate, but the "native" wording for ecosystem integrations is high-level and could be expanded in a future revision if the post needs more nuance around Collector distribution differences.
