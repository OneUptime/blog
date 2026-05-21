# Validation Summary: How to Set Up Trace-Based Alerting with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio distributed tracing
- OpenTelemetry Collector spanmetrics connector
- Prometheus and PrometheusRule alerting
- Grafana Tempo metrics-generator and service graph metrics
- Jaeger query API
- Alertmanager
- Apache SkyWalking alarm rules
- Kubernetes CronJob

## Sources Consulted
- Istio OpenTelemetry distributed tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- OpenTelemetry Collector spanmetrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Grafana Tempo metrics-generator configuration: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo span metrics documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/
- Grafana Tempo service graph metrics documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/
- Jaeger API documentation: https://www.jaegertracing.io/docs/latest/architecture/apis/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Apache SkyWalking backend alarm documentation: https://skywalking.apache.org/docs/main/latest/en/setup/backend/backend-alarm/

## Issues Found
- The OpenTelemetry Collector spanmetrics example used the deprecated `dimensions_cache_size` option. Replaced it with `aggregation_cardinality_limit`, which is the current connector setting for limiting tracked dimension combinations.
- The spanmetrics latency alert queried `traces_spanmetrics_duration_bucket`, which does not match the current duration metric naming used with the connector. Added `namespace: traces.spanmetrics`, set the histogram unit to seconds, and updated the query to `traces_spanmetrics_duration_seconds_bucket` so the threshold comparison is in seconds.
- The Tempo metrics-generator example configured processors but did not enable them. Added the `overrides.defaults.metrics_generator.processors` setting with `service-graphs` and `span-metrics`, as Tempo documents metrics-generator processors as disabled by default.
- The Jaeger CronJob used `curlimages/curl` while running `python3`, which would fail because that image is not a Python runtime. Switched to `python:3.12-alpine` and used Python's standard library for both the Jaeger query and Alertmanager POST.
- The Jaeger query encoded tags as `error=true`; the Jaeger API expects the `tags` parameter as structured tag data. Updated the request to URL-encode a JSON tags object.
- The CronJob sent alerts to Alertmanager's removed/deprecated v1 alert endpoint. Updated it to post to `/api/v2/alerts`.
- The SkyWalking alarm snippet used the older `metrics-name`/`op`/`threshold`/`count` rule format and a top-level `webhooks` list. Updated it to current MQE `expression` alarm rules and the documented `hooks.webhook` structure.
- The Alertmanager routing example used deprecated `match` blocks and the older PagerDuty `service_key`. Updated routes to `matchers` and PagerDuty configuration to `routing_key`.
- The Jaeger section heading said alerts were via Prometheus even though the example posts directly to Alertmanager. Renamed it to "Jaeger Alerts via Alertmanager" and adjusted the description.

## Review Notes
The post is technically relevant and implementation-focused. The examples remain illustrative rather than a complete production deployment; in particular, Istio still must be configured with an OpenTelemetry tracing extension provider and Telemetry resource, and Tempo remote write to Prometheus requires Prometheus to accept remote write traffic.
