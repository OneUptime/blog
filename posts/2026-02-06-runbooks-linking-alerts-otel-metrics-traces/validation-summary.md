# Validation Summary: How to Write Runbooks That Link Alerting Rules to Specific OpenTelemetry Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry metrics and semantic conventions
- Prometheus PromQL and alerting rules
- Grafana Tempo TraceQL
- Kubernetes kubectl rollout commands
- Markdown code examples

## Sources Consulted
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry JVM metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/jvm-metrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Grafana Tempo TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The nested Markdown examples used triple backtick outer fences while also containing triple backtick code blocks. I changed the outer runbook examples to four-backtick fences and corrected incorrect closing fences so the examples render as intended.
- The PromQL examples filter on `service_name`, but OpenTelemetry `service.name` is a resource attribute and is not automatically a Prometheus metric label in every exporter configuration. I added a brief note that the examples assume `service.name` is promoted to `service_name`.
- The database TraceQL example used the older `db.system` span attribute. I updated it to the current OpenTelemetry semantic convention attribute `db.system.name`.
- The TraceQL snippets used unscoped intrinsic fields such as `status`, `kind`, `name`, and `duration`. I updated them to current scoped intrinsic syntax such as `span:status`, `span:kind`, `span:name`, and `span:duration`.
- The JVM memory PromQL example used the outdated `process_runtime_jvm_memory_usage_bytes` metric name. I updated it to `jvm_memory_used_bytes`, matching the current `jvm.memory.used` OpenTelemetry JVM metric after Prometheus name and unit translation.

## Review Notes
The PromQL metric names are valid for the default OpenTelemetry-to-Prometheus translation strategy that escapes dots to underscores and appends unit/type suffixes. The placeholder internal runbook and Grafana URLs are plausible examples rather than externally verifiable public links.
