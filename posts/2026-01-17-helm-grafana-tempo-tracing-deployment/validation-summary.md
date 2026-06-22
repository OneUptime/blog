# Validation Summary: Deploying Grafana Tempo Distributed Tracing with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Grafana Tempo
- Grafana Tempo Helm charts
- Helm
- Kubernetes
- OpenTelemetry Collector
- Grafana Tempo data source
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- S3, GCS, and MinIO object storage
- TraceQL

## Sources Consulted
- Grafana Tempo Helm deployment documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/deploy/kubernetes/helm-chart/
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo metrics-generator documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/
- Grafana Tempo API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Helm chart source for tempo-distributed values: https://github.com/grafana/helm-charts/blob/main/charts/tempo-distributed/values.yaml
- Grafana Helm chart source for tempo-distributed README: https://github.com/grafana/helm-charts/blob/main/charts/tempo-distributed/README.md
- Tempo Helm chart getting started source: https://github.com/grafana/tempo/blob/main/docs/sources/helm-charts/tempo-distributed/get-started-helm-charts/_index.md

## Issues Found
- The post used the old `grafana` Helm repository and chart names. Updated commands to use the current `grafana-community` Helm repository and chart references documented after the chart migration.
- The distributed values example used `global.image.repository` and `global.image.tag`, which do not set the Tempo image in the current `tempo-distributed` chart. Changed this to `tempo.image.repository` and `tempo.image.tag`, and updated the pinned Tempo image to `2.9.0`.
- The distributed values example configured receiver endpoints but did not enable the chart receiver services/ports. Added `traces.*.enabled` values for Jaeger, Zipkin, and OTLP where relevant.
- The ingester persistence example used `storageClassName`, but the current chart value is `ingester.persistence.storageClass`. Updated the key.
- The query-frontend example placed search limits under `queryFrontend.query.search`, which is for the legacy tempo-query sidecar. Moved exposed settings to `queryFrontend.config.search` and used `tempo.structuredConfig.query_frontend.search` for `max_duration` and `default_result_limit`.
- The metrics-generator examples implied `metricsGenerator.enabled` and processor config alone enable generated metrics. Added `overrides.defaults.metrics_generator.processors` with `service-graphs` and `span-metrics`, as required by Tempo overrides.
- The metrics-generator remote write example used `metricsGenerator.config.remote_write`; the current chart expects it under `metricsGenerator.config.storage.remote_write`. Updated both metrics-generator snippets.
- The metrics-generator processor examples included unsupported `enabled: true` flags under `service_graphs` and `span_metrics`. Removed those flags.
- The MinIO example used credentials that did not match the chart's MinIO defaults. Updated the MinIO root credentials and bucket list to match the S3 storage configuration.
- The multi-tenancy Helm values example put tenant-specific overrides under `overrides`; current chart values use `per_tenant_overrides` for runtime tenant overrides. Updated the key.
- The TraceQL slow trace example used `{ duration > 1s }`; current TraceQL uses `trace:duration` for trace-level duration. Updated it to `{ trace:duration > 1s }`.
- The troubleshooting search curl used an unencoded TraceQL query with `service.name`, which is not the resource-scoped field used elsewhere in the post. Replaced it with `curl -G --data-urlencode 'q={resource.service.name="frontend"}'`.

## Review Notes
The corrected snippets were syntax-checked as YAML. Helm was not installed in the review environment, so chart rendering was verified against official chart values and documentation rather than a local `helm template` run.
