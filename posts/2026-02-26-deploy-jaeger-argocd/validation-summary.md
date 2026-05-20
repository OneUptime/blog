# Validation Summary: How to Deploy Jaeger with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD Application manifests and sync options
- Kubernetes custom resources and kubectl commands
- Jaeger Operator and Jaeger custom resources
- Jaeger Elasticsearch storage, index cleaner, and rollover
- OpenTelemetry OTLP exporter configuration
- Grafana Jaeger datasource provisioning
- Helm chart dependencies and values

## Sources Consulted
- Jaeger Operator for Kubernetes documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger Helm charts repository and jaeger-operator chart README/values: https://github.com/jaegertracing/helm-charts/tree/v1/charts/jaeger-operator
- Jaeger Operator CRD/API source: https://github.com/jaegertracing/jaeger-operator
- Jaeger sampling documentation: https://www.jaegertracing.io/docs/1.22/sampling/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Grafana Jaeger datasource documentation: https://grafana.com/docs/grafana/latest/datasources/jaeger/

## Issues Found
- The introduction claimed the guide covered Cassandra, but the post only provides memory and Elasticsearch examples. Changed the claim to Elasticsearch only.
- The Helm values included unsupported `crd.install` and `serviceMonitor` keys for the current v1 `jaeger-operator` chart. Removed those keys and noted the webhook certificate/cert-manager prerequisite from the chart docs.
- The Elasticsearch rollover example did not enable `es.use-aliases`, which Jaeger requires for rollover. Added `use-aliases: true`.
- The sampling example used `per_operation_strategies`, which is not the Jaeger sampling strategy key. Changed it to `service_strategies` for the shown service-level override.
- The OpenTelemetry description said only "OTLP endpoint" while the environment variables configure OTLP/gRPC on port 4317. Clarified it as the OTLP gRPC endpoint.
- The Grafana datasource snippet used the older `tracesToLogs` key. Updated it to `tracesToLogsV2`, matching current Grafana provisioning docs.
- The Mermaid diagram placed the collector node inside the Applications subgraph. Moved the collector node definition into the Jaeger subgraph.

## Review Notes
The post remains focused on Jaeger Operator v1-style custom resources. Jaeger v2 documentation and deployment models continue to evolve, so future updates should explicitly state whether the guide targets Jaeger Operator v1.x or a newer Jaeger v2 deployment approach.
