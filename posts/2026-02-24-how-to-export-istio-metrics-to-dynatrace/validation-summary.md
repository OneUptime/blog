# Validation Summary: How to Export Istio Metrics to Dynatrace

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Istio service mesh metrics
- Dynatrace Kubernetes monitoring and Prometheus metric ingestion
- Dynatrace Operator and DynaKube
- OpenTelemetry Collector
- Prometheus scraping and federation
- Kubernetes manifests, RBAC, and kubectl commands
- Dynatrace DQL and metric selector syntax

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Dynatrace Monitor Prometheus metrics in Kubernetes: https://docs.dynatrace.com/docs/observe/infrastructure-observability/container-platform-monitoring/kubernetes-monitoring/monitor-prometheus-metrics
- Dynatrace DynaKube parameters: https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/reference/dynakube-parameters
- Dynatrace DynaKube API migration overview: https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/guides/migration/dynakube
- Dynatrace OTLP API endpoints: https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api
- Dynatrace OTLP metrics ingest behavior: https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api/ingest-otlp-metrics/about-metrics-ingest
- Dynatrace Prometheus with OpenTelemetry Collector: https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/use-cases/prometheus
- Dynatrace Metrics API ingest endpoint: https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/post-ingest-metrics
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus remote write specification: https://prometheus.io/docs/specs/prw/remote_write_spec/

## Issues Found
- The DynaKube sample used `dynatrace.com/v1beta1`, which is no longer served by current Dynatrace Operator versions. Updated it to `dynatrace.com/v1beta6`.
- The post implied Prometheus scraping was enabled by a `DT_PROMETHEUS_ENABLED` OneAgent environment variable. Replaced this with the current Dynatrace setup requirement: enable Kubernetes monitoring and the cluster setting for annotated Prometheus exporters.
- The Dynatrace Prometheus filter listed histogram child series for `istio_request_duration_milliseconds`. Dynatrace applies filters to the OpenMetrics metric family for histograms, so the filter was corrected to the family name.
- The OTel Collector pipeline converted cumulative metrics to delta without `metricstarttime`. Added `metricstarttime` and `cumulativetodelta.max_staleness`, matching Dynatrace's current Collector guidance.
- The OTel Collector header used older environment variable interpolation. Updated it to `${env:DT_API_TOKEN}`.
- The Kubernetes deployment referenced a service account but did not define the ServiceAccount or RBAC needed for pod discovery. Added minimal ServiceAccount, ClusterRole, and ClusterRoleBinding manifests.
- The Prometheus remote write example incorrectly pointed Prometheus remote write at Dynatrace's `/api/v2/metrics/ingest` endpoint. Replaced it with a Prometheus federation scrape through the OTel Collector, because the Dynatrace metrics ingest API expects line protocol rather than Prometheus remote write protobuf.
- The DQL example averaged a counter directly. Updated it to use `sum(..., rate: 1m)` for request throughput.
- The troubleshooting connectivity check targeted the line-protocol metrics endpoint instead of the OTLP metrics endpoint used by the collector. Updated it to check `/api/v2/otlp/v1/metrics`.

## Review Notes
The post is now technically valid as a current integration guide. In a production follow-up, the author could add label-dropping examples with the OTel transform processor to make the cost-management advice more directly actionable.
