# Validation Summary: How to Build a Grafana USE Method Dashboard from OpenTelemetry Host Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry hostmetrics receiver
- OpenTelemetry resourcedetection processor
- OpenTelemetry Prometheus exporter
- Prometheus and PromQL
- Grafana dashboards and template variables
- USE method infrastructure monitoring

## Sources Consulted
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Prometheus exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusexporter
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry system metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- Prometheus PromQL operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Live verification with `otel/opentelemetry-collector-contrib:latest` / collector v0.153.0, using the post's hostmetrics and Prometheus exporter configuration.

## Issues Found
- The PromQL examples used OpenTelemetry metric names without the default Prometheus exporter unit/type suffixes. I updated the metric names to the exposed Prometheus names confirmed by the current Collector, such as `system_cpu_utilization_ratio`, `system_memory_utilization_ratio`, `system_disk_io_time_seconds_total`, `system_disk_weighted_io_time_seconds_total`, `system_paging_usage_bytes`, and `system_network_io_bytes_total`.
- The CPU saturation query divided a load-average vector by a CPU-count vector with incompatible label sets. I changed the load average side to `avg by (host_name)` so the division matches by host.
- The network throughput query added transmit and receive vectors before aggregation, but those vectors have different `direction` labels and would not match. I changed it to sum the rate of `system_network_io_bytes_total` by host and device.
- The swap and filesystem utilization queries added separate `state="used"` and `state="free"` vectors directly, which would not match because of the differing `state` labels. I changed them to aggregate by the stable dimensions before dividing.
- The memory saturation description called `system_paging_operations_total` a page fault rate. I changed the description to page-in/page-out rate, which matches the hostmetrics paging metric.
- The network utilization text described the query as a fraction of interface capacity, but the hostmetrics receiver exposes throughput, not interface capacity. I clarified that the query returns bytes per second and should be compared with interface capacity separately.
- The Grafana template variable example referenced the unsuffixed CPU metric. I updated it to `label_values(system_cpu_utilization_ratio, host_name)`.

## Review Notes
- The Collector configuration is syntactically valid for current `otel/opentelemetry-collector-contrib` and starts successfully with the Prometheus exporter.
- OpenTelemetry system metric semantic conventions are still marked development in several areas. The current Collector output retains legacy labels such as `state`, `device`, and `direction` for these hostmetrics in Prometheus output.
- `label_values(<metric>, <label>)` is the Grafana Prometheus data source's classic query syntax; Grafana's newer variable editor can also express this as a Label values query.
