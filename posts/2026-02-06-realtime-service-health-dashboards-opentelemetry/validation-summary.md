# Validation Summary: How to Build Real-Time Service Health Dashboards with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Python SDK
- OpenTelemetry semantic conventions
- OTLP HTTP metrics exporter
- Prometheus/PromQL histogram queries
- RED metrics and service health dashboards
- psutil-based host and process metrics

## Sources Consulted
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry system metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- OpenTelemetry process metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/process-metrics/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- Prometheus histogram and summary practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query function docs: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The RED metrics snippet imported `SERVICE_NAME` from `opentelemetry.sdk.resources` and included an unused `time` import. Replaced the resource key with the literal `service.name` semantic attribute and removed the unused import.
- The post presented custom request and error counters as standard OpenTelemetry metric names. Updated the wording to describe them as custom RED metrics aligned with OpenTelemetry semantic attributes.
- The HTTP request attributes used older names (`http.method`, `http.status_code`) and string status codes. Updated them to `http.request.method`, `http.response.status_code`, and added `url.scheme`.
- The HTTP duration histogram used milliseconds, but the stable `http.server.request.duration` convention uses seconds. Updated the unit, function parameter names, health computation field names, and latency thresholds accordingly.
- The infrastructure snippet used non-UCUM units such as `percent`, `bytes`, and `fds`. Updated units to `1`, `By`, and `{file_descriptor}`.
- The CPU, memory, file descriptor, and network metric snippets did not match current OpenTelemetry system/process metric names and attributes. Updated them to use documented metric names and attributes such as `system.cpu.utilization`, `system.memory.usage`, `process.unix.file_descriptor.count`, `system.network.io`, `cpu.mode`, `cpu.logical_number`, `system.memory.state`, `network.interface.name`, and `network.io.direction`.
- The dependency duration metric used milliseconds while the rest of the corrected examples use seconds. Updated the unit and parameter names to seconds.
- The PromQL histogram percentile examples omitted service-level bucket aggregation and referenced the wrong Prometheus histogram bucket name for a seconds-based duration metric. Updated them to use `histogram_quantile(..., sum by (le) (rate(http_server_request_duration_seconds_bucket{...}[5m])))`.

## Review Notes
The examples now parse syntactically as Python. The dashboard configuration remains illustrative because dashboard schema fields such as `type`, `rows`, and `panels` are vendor-specific rather than a portable OpenTelemetry standard.
