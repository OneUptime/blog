# Validation Summary: How to Configure the OpenTelemetry Collector for Chronosphere Ingestion with

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP) gRPC exporter
- OpenTelemetry Collector processors: batch, resource, resourcedetection, filter, attributes, metricstransform
- Chronosphere Observability Platform OTLP ingestion
- Chronosphere service accounts and Chronoctl
- Kubernetes Secrets and Deployments
- Prometheus / PromQL

## Sources Consulted
- Chronosphere OpenTelemetry Collector ingestion documentation: https://docs.chronosphere.io/ingest/metrics-traces/otel/otel-ingest
- Chronosphere service accounts documentation: https://docs.chronosphere.io/administer/accounts-teams/service-accounts
- Chronosphere ingestion troubleshooting documentation: https://docs.chronosphere.io/ingest/metrics-traces/troubleshooting
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector metricstransform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md

## Issues Found
1. **Outdated Collector environment-variable syntax**: The Collector examples used `${VAR}` interpolation. Current Collector documentation shows `${env:VAR}`. Updated endpoint, header, and resource attribute references to use `${env:CHRONOSPHERE_TENANT}` and `${env:CHRONOSPHERE_SERVICE_ACCOUNT_TOKEN}`.
2. **Missing Chronosphere metric ingestion resource requirement**: Chronosphere documents that OTLP metrics require `service.instance.id`. Added `resourcedetection` and `resource/service-instance` processors and included them in metrics pipelines.
3. **Outdated filter processor syntax**: The filter example used the older `metrics.exclude.metric_names` form. The current filter processor README documents OTTL-based `metric_conditions`. Replaced the filter with OTTL `IsMatch(metric.name, ...)` conditions.
4. **Incorrect Chronoctl service-account command**: The original command used `--permissions "metrics:write,traces:write"`, which does not match the documented restricted service-account flags. Updated it to `chronoctl service-accounts create --name "otel-collector" --permission WRITE`.
5. **Invalid cardinality-management attribute example**: The snippet deleted `http.url` and then tried to populate `http.route` from the deleted attribute, which would not produce a lower-cardinality route. Removed that invalid upsert.
6. **Invalid `metricstransform` operation**: `delete_label_value` requires a specific `label_value` and deletes data points with that label value; it does not remove a high-cardinality label key. Replaced it with `aggregate_labels` and an explicit low-cardinality label set plus `aggregation_type: sum`.
7. **Misleading multi-endpoint wording**: Chronosphere's documented OTLP setup uses the tenant endpoint for metrics and traces. Updated the wording to describe separate exporter instances rather than implying separate Chronosphere endpoints are always provided.

## Review Notes
- The Kubernetes Deployment still uses `otel/opentelemetry-collector-contrib:latest`, which is valid YAML but should be pinned to a tested Collector version in production.
- The monitoring PromQL uses Prometheus `_total` suffixes. Current Collector internal telemetry docs list OTLP-format metric names without `_total`, while noting that the default Prometheus exporter adds `_total` to sum metrics unless configured otherwise.
