# Validation Summary: How to Correlate Traces with Metrics in Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Envoy distributed tracing
- Prometheus metrics and exemplars
- Grafana data source provisioning
- Grafana Tempo and TraceQL
- OpenTelemetry Collector
- Go Prometheus client

## Sources Consulted
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio observability concepts: https://istio.io/latest/docs/concepts/observability/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Grafana Tempo data source provisioning: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana Prometheus data source configuration and exemplars: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana Tempo metrics-generator span metrics documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/spanmetricsconnector
- Prometheus Go client API documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver

## Issues Found
- The Go exemplar snippet used `http.Request` and `time.Now` without importing `net/http` and `time`. Added the missing imports so the snippet is syntactically complete.
- The application-level exemplar wording implied the OpenTelemetry SDK alone attaches exemplars to Prometheus metrics. Clarified that the example uses OpenTelemetry for tracing and the Prometheus Go client for metrics.
- The shared-label section stated that Istio metric labels appear directly as trace attributes. Istio can include Istio-specific tracing tags, but exact trace attribute names depend on tracing provider, backend, and enrichment configuration. Changed the wording to describe equivalent attributes and backend-specific names.
- The Grafana data source provisioning snippets linked Prometheus and Tempo by UID but did not define those UIDs. Added `uid` fields to make the examples internally consistent.
- The Tempo metrics-generator example wrote to Prometheus remote write without noting that Prometheus must have its remote write receiver enabled, and it did not show the `overrides` block needed to enable metrics-generator processors. Added the receiver caveat and `service-graphs` / `span-metrics` processor enablement.
- The OpenTelemetry Collector example used the deprecated `spanmetrics` processor with `metrics_exporter`. Replaced it with the current `span_metrics` connector pattern and updated the trace and metrics pipelines accordingly.
- The OpenTelemetry Collector connector example included `service.name` as an extra dimension even though the span metrics connector includes service name by default. Removed the redundant dimension and clarified the default/configured dimension behavior.
- The OpenTelemetry-generated metric names used the older `traces_spanmetrics_*` form. Updated the examples to the current default connector namespace after Prometheus normalization: `traces_span_metrics_duration_bucket` and `traces_span_metrics_calls_total`.
- The TraceQL dashboard example applied `duration > 1s` as a pipeline expression. Changed it to a standard span filter inside the selector, matching Grafana's documented examples.
- The summary referred to the deprecated OpenTelemetry Collector spanmetrics processor. Updated it to refer to the span metrics connector.

## Review Notes
The Grafana Tempo metrics-generator section uses Tempo's own `span_metrics` processor, while the OpenTelemetry Collector section uses the OpenTelemetry `span_metrics` connector. The similar names refer to different components, and the post now keeps that distinction clear.
