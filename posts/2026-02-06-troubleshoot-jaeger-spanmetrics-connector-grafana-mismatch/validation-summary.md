# Validation Summary: How to Troubleshoot the Jaeger spanmetrics Processor vs Connector Format

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry spanmetrics processor
- OpenTelemetry span_metrics connector
- Prometheus and PromQL
- Grafana dashboards
- OpenTelemetry Transform Processor

## Sources Consulted
- OpenTelemetry Collector spanmetrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry spanmetrics processor package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/spanmetricsprocessor
- OpenTelemetry Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/

## Issues Found
- The post used the deprecated connector component name `spanmetrics`. Updated current Collector configuration examples to use `span_metrics`, while leaving references to the deprecated processor as `spanmetrics`.
- The connector metric names were shown as `traces_spanmetrics_*`. Updated them to the current Prometheus-normalized default namespace form, `traces_span_metrics_*`.
- The old processor label for span operation was shown as `span_name`. Updated old processor examples to use `operation`, and new connector Prometheus examples to use `span_name`.
- The label comparison table conflated OpenTelemetry dotted dimensions with Prometheus labels. Updated it to distinguish processor labels, connector dimensions, and Prometheus-normalized labels.
- The diagnostic grep command searched only for `spanmetrics`, which would miss the corrected default metric names. Updated it to match `traces_span_metrics`, `calls_total`, or `duration_milliseconds`.
- The compatibility recording rules only aliased metric names and did not map `span_name` back to the processor's `operation` label. Updated the rules to use PromQL `label_replace`.
- The connector configuration used deprecated `dimensions_cache_size`. Updated it to `aggregation_cardinality_limit`.
- The transform processor example mapped `span.name` to `span_name`, which is not the processor-compatible label. Updated it to map `span.name` to `operation`.
- The old/new comparison query used direct vector equality between metrics with different label sets. Replaced it with separate aggregated comparison queries.

## Review Notes
The post is now accurate for the current span_metrics connector and for Prometheus' default OpenTelemetry translation behavior. Future readers should still verify the exact metric names on their own `/metrics` endpoint, because Prometheus translation strategy, Collector feature gates, namespace settings, and duration unit settings can change the final names exposed to Grafana.
