# Validation Summary: How to Correlate OpenTelemetry Profiles with Metrics to Identify

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry metrics and profiles
- Prometheus Remote Write
- Grafana dashboards
- Grafana Pyroscope
- Alertmanager
- Python requests

## Sources Consulted
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector architecture and pipeline documentation: https://opentelemetry.io/docs/collector/architecture/
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OS process metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/process-metrics/
- OpenTelemetry Go runtime metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/go-metrics/
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Grafana Pyroscope OpenTelemetry profiling support: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- Grafana Pyroscope server HTTP API: https://grafana.com/docs/pyroscope/latest/reference-server-api/
- Grafana Pyroscope profile types and instrumentation: https://grafana.com/docs/pyroscope/latest/configure-client/profile-types/
- Grafana dashboard time range documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/
- Grafana panel query and time override documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The Collector example used `prometheusremotewrite`, which is now a deprecated alias. Changed it to `prometheus_remote_write` and kept the endpoint format consistent with the exporter documentation.
- The metrics example filtered on `service_name`, but the Collector remote write exporter does not add all resource attributes as metric labels unless `resource_to_telemetry_conversion.enabled` is set. Added that setting.
- The profile exporter example used `otlphttp/pyroscope` without matching Pyroscope's documented OTLP gRPC setup. Changed it to `otlp/pyroscope` with `endpoint: pyroscope:4040` and `tls.insecure: true`.
- The profiles pipeline omitted the current Collector feature gate requirement for profiles. Added a comment showing `--feature-gates=service.profilesSupport`.
- The PromQL example used `process_cpu_seconds_total`, which is a Prometheus-style process metric and did not match the `process.cpu.utilization` metric discussed in the post. Changed it to `process_cpu_utilization{service_name="checkout-service", cpu_mode="user"}`.
- The Grafana explanation referred to a shared "time variable." Updated it to the dashboard time range behavior documented by Grafana, with panel-specific overrides as the caveat.
- The Pyroscope curl example used `/api/v1/query_range` and an incomplete profile type ID. Changed it to the documented `GET /pyroscope/render` endpoint and the full `process_cpu:cpu:nanoseconds:cpu:nanoseconds` profile type.
- The memory metric `process.runtime.go.mem.heap_alloc` is not the current OpenTelemetry Go runtime semantic convention. Changed it to `go.memory.allocated`.
- The Python memory profile query used `/api/v1/query` and an incomplete memory profile type. Changed it to `/pyroscope/render` and `memory:alloc_space:bytes:space:bytes`.
- The Python example used a naive `datetime`, making `timestamp()` depend on the local timezone. Changed it to an explicit UTC datetime.
- The Alertmanager route used the older `match` form. Changed it to the current `matchers` syntax.

## Review Notes
The post is technically valid after the fixes. The OpenTelemetry profiles signal and Pyroscope OTLP profile ingestion are still version-sensitive, so deployments should pin compatible Collector and Pyroscope versions and test the profiles pipeline before production rollout.
