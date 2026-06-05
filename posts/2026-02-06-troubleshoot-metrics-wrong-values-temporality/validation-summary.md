# Validation Summary: How to Troubleshoot Metrics Showing Wrong Values After Switching Between Delta

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry SDK metric aggregation temporality
- OTLP metric exporter configuration
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Collector processors
- Prometheus metrics
- Datadog, New Relic, and Splunk Observability Cloud OTLP metric ingestion
- Kubernetes CLI commands for inspecting Collector configuration and logs

## Sources Consulted
- OpenTelemetry OTLP Metrics Exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python SDK environment variables documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/environment_variables.html
- Datadog OpenTelemetry delta temporality guide: https://docs.datadoghq.com/opentelemetry/guide/otlp_delta_temporality/
- Go OpenTelemetry OTLP metric gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector cumulative-to-delta processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/cumulativetodeltaprocessor
- OpenTelemetry Collector delta-to-cumulative processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/deltatocumulativeprocessor
- Prometheus metric type documentation: https://prometheus.io/docs/concepts/metric_types/
- New Relic OpenTelemetry metrics best practices: https://docs.newrelic.com/docs/opentelemetry/best-practices/opentelemetry-best-practices-metrics/
- Splunk cumulative-to-delta processor documentation: https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/collector-components/processors/cumulative-to-delta-processor

## Issues Found
- The delta temporality explanation described interval values as rates. Updated the wording and example labels to distinguish interval changes from per-second rates.
- The Prometheus mismatch example said Prometheus would see a counter reset on every scrape even when the sample values were unchanged. Updated it to describe flat or resetting counters and show a decreasing delta value as the reset case.
- The backend temporality table was too absolute for OTLP/gRPC, Datadog, New Relic, and Splunk. Updated the entries to reflect current backend-specific behavior and documented preferences.
- The Python example used `Counter`, `UpDownCounter`, and `Histogram` without importing them. Added the correct OpenTelemetry SDK metric imports.
- The Python example claimed `UpDownCounter` is always cumulative. Removed the overbroad comment and kept the cumulative setting used by OpenTelemetry's delta temporality preference.
- The Go example used the wrong temporality return type and constants. Added the `metricdata` import and changed the selector to return `metricdata.Temporality` with `metricdata.CumulativeTemporality`.
- The `cumulativetodelta` example included `http.server.active_requests`, which is an active/concurrent request style metric and not an appropriate monotonic cumulative conversion example. Replaced it with `http.server.response.body.size`.

## Review Notes
The Collector `deltatocumulative` processor is currently listed as alpha in the official Collector processor list, while `cumulativetodelta` is beta. The post's examples are otherwise aligned with current documented environment variables, SDK APIs, and processor configuration fields.
