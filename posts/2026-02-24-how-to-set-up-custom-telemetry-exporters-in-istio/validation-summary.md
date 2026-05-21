# Validation Summary: How to Set Up Custom Telemetry Exporters in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig extension providers
- Envoy access logging
- OpenTelemetry Collector
- OpenTelemetry Collector exporters and processors
- Prometheus remote write
- Datadog
- Grafana Cloud, Loki, Tempo, and Mimir
- Elasticsearch
- AWS X-Ray and CloudWatch Logs

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio OpenTelemetry access log task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio custom metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Datadog exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/datadogexporter/README.md
- OpenTelemetry Collector Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector AWS X-Ray exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awsxrayexporter/README.md
- OpenTelemetry Collector AWS CloudWatch Logs exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awscloudwatchlogsexporter/README.md
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/

## Issues Found
- The introduction overstated that Zipkin traces and access logs are provided "out of the box." Updated the wording to say Istio telemetry can generate metrics, traces, and access logs.
- The OpenTelemetry Collector filter processor example used the older `metrics.include.metric_names` syntax. Updated it to the current OTTL-based `metric_conditions` syntax.
- The Collector examples used the deprecated `logging` exporter. Replaced it with the current `debug` exporter and updated pipeline references.
- The Collector deployment scraped Kubernetes pods through Prometheus Kubernetes service discovery but did not grant pod list/watch RBAC. Added a ServiceAccount, ClusterRole, ClusterRoleBinding, and `serviceAccountName`.
- The Istio provider example used a single `opentelemetry` extension provider for both tracing and access logging. Split it into `opentelemetry` for traces and `envoyOtelAls` for access logs, which are distinct MeshConfig provider types.
- The Telemetry resources used `telemetry.istio.io/v1alpha1`. Updated them to the current `telemetry.istio.io/v1` API.
- The Datadog API key example used `${DD_API_KEY}`. Updated it to the Collector's current environment variable expansion form, `${env:DD_API_KEY}`.
- The Grafana Cloud Loki example used the removed/deprecated `loki` exporter and the Loki push endpoint. Updated it to use `otlphttp/loki` with Loki's OTLP endpoint.
- The access log formatting text said the Telemetry API can customize log format. Updated it to mention MeshConfig provider `logFormat` or EnvoyFilter, since the Telemetry API selects, disables, and filters providers rather than defining custom formats.
- The "Creating Custom Metrics" section claimed the Telemetry API creates entirely new metrics. Updated it to describe adding or overriding metric labels, which is what the shown `tagOverrides` configuration does.
- The custom metric label expressions used JavaScript-style `||` fallback expressions. Replaced them with valid CEL conditional expressions using `has(...)`.
- The multi-backend example referenced a non-existent built-in `pagerduty` exporter. Replaced it with a clearly custom-named `webhook/pagerduty` exporter reference.
- The scaling guidance said metrics collectors can be scaled behind a standard Service without caveats. Updated it to note that Prometheus receiver replicas with identical scrape configs can duplicate samples and should use sharding or backend-aware deduplication.

## Review Notes
Several exporter examples still require backend-specific credentials, TLS, and production hardening before use. The post now avoids deprecated or incorrect API forms, but readers should pin Collector image versions instead of using `latest` in production.
