# Validation Summary: How to Deploy Tempo on Rancher for Trace Storage - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Grafana Tempo
- Grafana
- MinIO
- OpenTelemetry Collector
- Grafana Loki
- Prometheus
- Python logging

## Sources Consulted
- Grafana Tempo documentation: Deploy with Helm - https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/deploy/kubernetes/helm-chart/
- Grafana Tempo documentation: Configure Tempo - https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo documentation: Metrics-generator - https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/
- Grafana Tempo documentation: Use tracing data in Grafana - https://grafana.com/docs/tempo/latest/configuration/use-trace-data/
- Grafana documentation: Provision the Tempo data source - https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana documentation: Configure trace to logs correlation - https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana documentation: Configure the Loki data source - https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana Loki documentation: Storage and schema guidance - https://grafana.com/docs/loki/latest/configure/storage/ and https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Helm charts source: `tempo-distributed` values and templates - https://github.com/grafana/helm-charts/blob/main/charts/tempo-distributed/values.yaml and https://raw.githubusercontent.com/grafana/helm-charts/main/charts/tempo-distributed/templates/_helpers.tpl
- MinIO official Helm chart values - https://raw.githubusercontent.com/minio/minio/master/helm/minio/values.yaml
- OpenTelemetry Collector configuration documentation - https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Python instrumentation documentation - https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python API docs (`SpanContext.is_valid`) - https://opentelemetry-python.readthedocs.io/en/latest/api/trace.span.html
- OpenTelemetry logging trace context specification - https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/
- Prometheus feature flags / remote write receiver - https://prometheus.io/docs/prometheus/latest/disabled_features/
- Prometheus community Helm chart values (`enableRemoteWriteReceiver`) - https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml

## Issues Found
- The introduction described Tempo as relying only on trace ID lookup and implied it did not support ad-hoc search. I updated this to reflect current Tempo behavior: low-cost storage without a large secondary index, plus TraceQL-based search and trace lookup by ID.
- The MinIO setup used `kubectl exec ... mc ...` inside the server pod to create the bucket. I replaced this with the official MinIO Helm chart `buckets` setting so the bucket is created during install using supported chart values.
- The `tempo-values.yaml` example used outdated or incorrect `tempo-distributed` chart paths such as `tempo.storage`, `tempo.ingester`, manual `distributor.receivers`, and top-level `serviceMonitor`. I rewrote the example to match the current chart structure: `storage`, `traces.*.enabled`, component `config` blocks, `overrides`, and `metaMonitoring.serviceMonitor`.
- The Tempo config enabled the metrics-generator component but did not enable any processors, which means span metrics and service graphs would not actually be produced. I added `overrides.defaults.metrics_generator.processors` with `service-graphs` and `span-metrics`.
- The Grafana Tempo data source pointed at query-frontend port `3100`, but the current Tempo docs and chart defaults use HTTP port `3200`. I corrected the URL and added a `uid` so the Loki derived field can link back to the Tempo data source reliably.
- The provisioned Grafana query string used `${...}` directly. I escaped it to `$${...}` because Grafana provisioning YAML treats `$` specially.
- The trace-to-logs section showed an unrelated Loki storage schema example and used legacy `boltdb-shipper` / `schema: v12` settings. I replaced that with the relevant Loki datasource `derivedFields` configuration needed for log-to-trace linking.
- The Python logging filter checked `span.is_recording()`, which can miss valid propagated span context, and attached the filter to the root logger instead of the handlers that actually format the records. I updated it to use `SpanContext.is_valid` and attach the filter to handlers.
- The pipeline test sent traces directly to Tempo and used the wrong query-frontend port, so it did not really validate the collector path described earlier in the post. I changed it to port-forward the collector and query frontend locally, send the test trace through the collector, and query Tempo on the correct port/API.
- The post remote-writes Tempo-generated metrics to Prometheus but did not mention that Prometheus must have its remote write receiver enabled. I added that requirement near the deployment step.

## Review Notes
- The post still assumes the default Rancher Monitoring Prometheus service name `rancher-monitoring-prometheus`; if the release name was customized, that URL must be adjusted.
- The Grafana datasource examples assume the Loki and Prometheus datasource UIDs are `loki` and `prometheus`; the post now notes that these must match the actual provisioned UIDs.
- The validation focused on current upstream documentation and current chart defaults as of 2026-04-23.
