# Validation Summary: How to Use Change Failure Rate Tracking with OpenTelemetry and DORA Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry semantic conventions
- OpenTelemetry Collector
- Prometheus Remote Write
- PromQL
- DORA software delivery metrics

## Sources Consulted
- DORA software delivery metrics guide: https://dora.dev/guides/dora-metrics/
- DORA Quick Check: https://dora.dev/quickcheck/
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md

## Issues Found
- The post described CFR as one of "the four DORA metrics." Current DORA guidance describes the original four keys evolving into a five-metric model, so the wording was changed to "one of the key DORA metrics."
- The CFR definition was too broad compared with current DORA wording. It now describes Change Fail Rate as deployments requiring immediate intervention after deployment.
- The deployment example used `deployment.environment` and `deployment.version`. These were changed to current semantic-convention-aligned attributes: `deployment.environment.name` and `service.version`.
- The Python example used `datetime.utcnow()`, which is deprecated in current Python. It now uses `datetime.now(timezone.utc)`.
- The evaluator queried a non-standard `http_server_request_count_total` metric and `status_code` label. It now uses the OpenTelemetry HTTP server request duration histogram count with the Prometheus-translated `http_response_status_code` label.
- The evaluator referenced helper methods that were not defined. Minimal implementations were added for p99 latency, Prometheus range queries, and rollback detection.
- The Collector configuration used an OTLP exporter for a Prometheus remote-write destination. It now uses the `prometheusremotewrite` exporter with a Prometheus remote-write endpoint and resource-to-telemetry label conversion.
- The DORA benchmark diagram used unsupported fixed CFR tiers of 0-5%, 5-10%, 10-15%, and 15%+. It was changed to avoid presenting those as universal DORA cutoffs.

## Review Notes
The examples are still intentionally simplified. In a production system, rollback detection should integrate with the deployment platform or incident-management system, and Prometheus label names may vary if a backend changes OpenTelemetry-to-Prometheus translation settings.
