# Validation Summary: How to Configure Tempo for Distributed Tracing in Grafana

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Tempo
- Grafana data source provisioning
- Kubernetes
- Helm
- OpenTelemetry Collector
- OpenTelemetry JavaScript, Python, and Go SDKs
- Jaeger, Zipkin, and OTLP trace ingestion
- TraceQL
- Prometheus metrics and Tempo metrics-generator
- Loki trace-to-logs correlation

## Sources Consulted
- Grafana Tempo Helm deployment documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/deploy/kubernetes/helm-chart/
- Grafana Tempo distributed Helm guide and values examples: https://github.com/grafana/tempo/blob/main/docs/sources/helm-charts/tempo-distributed/get-started-helm-charts/_index.md
- Grafana Community tempo-distributed Helm chart values: https://github.com/grafana-community/helm-charts/blob/main/charts/tempo-distributed/values.yaml
- Grafana Tempo configuration manifest: https://grafana.com/docs/tempo/latest/configuration/manifest/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana trace-to-metrics documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-metrics/
- Grafana Service Graph documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo span metrics documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/
- OpenTelemetry JavaScript SDK docs and 2.x upgrade notes: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html and https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript semantic conventions package docs: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry Go semantic conventions package docs: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Collector tail sampling processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md

## Issues Found
- The production `tempo-values.yaml` used obsolete/incorrect `tempo.storage`, `tempo.receivers`, and `tempo.retention` nesting for the current `tempo-distributed` Helm chart. Updated it to top-level `storage`, `traces`, `overrides`, `compactor.config.compaction.block_retention`, and enabled `metricsGenerator`.
- The distributed install command used `grafana/tempo-distributed` while current Tempo Helm documentation points to `grafana-community/tempo-distributed`. Added the `grafana-community` repository and updated the install command.
- The Grafana Tempo data source provisioning used the older `tracesToLogs` shape. Updated it to `tracesToLogsV2` with current tag mapping syntax and pointed the data source at the enabled gateway service.
- The Node.js OpenTelemetry example used the removed `Resource` class and deprecated `SemanticResourceAttributes` namespace. Replaced them with `resourceFromAttributes` and current semantic convention constants.
- The Go example imported an old semantic convention package version. Updated it to `go.opentelemetry.io/otel/semconv/v1.37.0`.
- A TraceQL duration example used `duration > 100ms`, which is not the current intrinsic selector form. Updated it to `span:duration > 100ms`.
- The trace volume PromQL panel grouped `tempo_distributor_spans_received_total` by `service_name`, which is not a service-level request metric. Replaced it with `traces_spanmetrics_calls_total` from Tempo metrics-generator.
- The retention and compaction YAML used invalid Helm nesting. Updated it to current chart-compatible `storage`, `ingester.config`, and `compactor.config` keys.
- The query performance snippet used unsupported `external_backend`, `external_endpoints`, and `queryFrontend.config.search.max_duration` keys. Replaced them with current `query_timeout`, `search.concurrent_jobs`, and `metrics.max_duration` fields.
- Fixed a markdown code fence issue around the custom Helm install command while editing the command block.

## Review Notes
Helm was not installed in the local environment, so chart rendering could not be verified with `helm template`. The review used official Grafana chart values and documentation instead. The application snippets are illustrative and still require the normal project dependencies and service-specific functions, such as `fetchUsers()`, to exist in a real application.
