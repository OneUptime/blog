# Validation Summary: How to Use Canary Testing with OpenTelemetry Metrics Comparison Between Old

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Python API
- OpenTelemetry Collector
- Prometheus and PromQL
- Kubernetes and kubectl
- Python
- Bash

## Sources Consulted
- OpenTelemetry HTTP metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry resource attributes documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The `http.server.request.duration` histogram used the standard OpenTelemetry metric name but recorded milliseconds with `unit="ms"`. The current semantic convention defines this metric in seconds, so the example now uses `unit="s"` and a `duration_s` argument.
- The HTTP metric attributes used older names, `http.method` and `http.status_code`. These were changed to the current stable names, `http.request.method` and `http.response.status_code`.
- The PromQL examples and Python analysis script queried `http_server_request_duration_bucket`, but the Collector Prometheus exporter appends the unit suffix by default. With the corrected seconds unit, the expected classic histogram bucket metric is `http_server_request_duration_seconds_bucket`.
- The Python analysis script printed latency as milliseconds even though the corrected OpenTelemetry metric uses seconds. The output now prints seconds.
- The Python analysis script could raise formatting errors when Prometheus returned no data. It now treats missing baseline or canary metrics as a failed analysis and rolls back.
- The error-rate comparison skipped the failure case where the baseline had zero errors and the canary had nonzero errors. The script now rolls back in that case.
- The Kubernetes example updated the baseline `checkout` deployment before running canary analysis. It now updates `deployment/checkout-canary` first and only updates `deployment/checkout` after the analysis passes.

## Review Notes
- The Collector configuration intentionally enables `resource_to_telemetry_conversion`; the official Prometheus exporter documentation confirms this converts resource attributes to metric labels, although the default behavior is to expose resource attributes on `target_info`.
- The custom `http.server.errors` and `http.server.requests` counters are not OpenTelemetry semantic convention metrics, but they are valid custom metrics for the tutorial's comparison logic.
