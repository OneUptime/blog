# Validation Summary: How to Compare Self-Hosted OpenTelemetry Backends vs SaaS Vendors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OTLP
- Grafana Tempo
- Grafana Mimir
- Grafana Loki
- Grafana
- Prometheus remote write
- SaaS observability vendors

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector Prometheus remote write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Loki native OTLP vs Loki exporter documentation: https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- Grafana Mimir HTTP API documentation: https://grafana.com/docs/mimir/latest/operators-guide/reference-http-api/
- Prometheus remote write specification: https://prometheus.io/docs/specs/prw/remote_write_spec/

## Issues Found
- The self-hosted example was introduced as a Kubernetes deployment, but the snippet is an OpenTelemetry Collector configuration, not a Kubernetes manifest. Changed the wording to "OpenTelemetry Collector configuration."
- The metrics exporter used the deprecated `prometheusremotewrite` component name. Updated it to the current `prometheus_remote_write` component name while keeping the Mimir `/api/v1/push` endpoint.
- The Loki logs example used the older Loki exporter and `/loki/api/v1/push` endpoint. Updated it to use the `otlphttp/loki` exporter with `endpoint: http://loki-distributor.monitoring:3100/otlp`, which is the current recommended path for Loki native OTLP ingestion through the Collector.
- The SaaS and hybrid examples used `${API_KEY}` for Collector environment substitution. Updated these to `${env:API_KEY}`, which matches current Collector configuration documentation.
- The hybrid example's filter processor matched critical spans, which would drop the high-value traces instead of sending them to SaaS. Updated it to drop non-critical traces with `trace_conditions` so only critical traces remain in the SaaS pipeline.
- The hybrid example referenced `otlp` and `batch` without defining them. Added minimal `receivers.otlp` and `processors.batch` definitions so the snippet is a coherent Collector configuration.

## Review Notes
- The cost examples are illustrative and explicitly described as rough estimates. Current vendor pricing varies widely by vendor, plan, region, retention, and billing dimension, so these figures should be periodically refreshed if the post is intended to be used as buying guidance.
- The filter processor `trace_conditions` syntax reflects the current documentation for Collector versions 0.146.0 and later. Older nested filter syntax is still supported but deprecated in current contrib documentation.
- YAML snippets were parsed successfully after the fixes.
