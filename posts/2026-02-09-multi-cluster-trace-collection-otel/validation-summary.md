# Validation Summary: How to Set Up Multi-Cluster Trace Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector load-balancing exporter
- OpenTelemetry Collector Kubernetes attributes processor
- OpenTelemetry Collector tail sampling processor
- Grafana Tempo
- Jaeger

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector gateway deployment pattern documentation: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector agent-to-gateway deployment pattern documentation: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector load-balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector Kubernetes attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/

## Issues Found
- The post described the setup as "OpenTelemetry Collector federation." OpenTelemetry's deployment documentation describes this as gateway or tiered Collector deployment, so the wording was updated throughout the post while preserving the tutorial structure.
- The Tier-2 description said central collectors aggregate metrics, but the post is about trace collection and the pipeline is a traces pipeline. Changed this to "aggregate traces."
- The Tier-1 config used `${CLUSTER_NAME}` and `${CLUSTER_REGION}`. Current Collector documentation uses `${env:VAR}` syntax for environment variable expansion, so these were updated.
- The Tier-1 config forwarded to a normal OTLP exporter while Tier-2 used `tail_sampling` with five replicas. The tail sampling processor requires all spans for a trace to reach the same Collector instance. Replaced the Tier-1 exporter with the `loadbalancing` exporter using `routing_key: traceID` and added text noting that the DNS name must resolve to the Tier-2 endpoints.
- The load-balancing exporter DNS resolver `port` field was initially numeric. The current Collector schema expects a string, so it was set to `"4317"`.
- The `file_storage` extension did not set `create_directory: true`. Current Collector validation fails if the configured directory does not exist, so directory creation was enabled.
- The Tier-1 Kubernetes manifest referenced a `ServiceAccount` for the `k8sattributes` processor but did not include the required RBAC. Added a `ServiceAccount`, `ClusterRole`, and `ClusterRoleBinding` with read access to pods, namespaces, and ReplicaSets.
- The Collector image tag was outdated (`0.92.0`). Updated both Collector deployments to `otel/opentelemetry-collector-contrib:0.153.0`, the current contrib release available on June 4, 2026.
- The Tempo search examples posted JSON bodies to `/api/search`. Tempo's documented search API uses GET query parameters such as `tags` or `q`. Updated the examples to `curl -G --data-urlencode 'tags=...'`.
- The Tempo examples used port `3100`, which is commonly used by Loki. Tempo's documented default HTTP listen port is `3200`, so the examples were updated.

## Review Notes
The Collector configurations embedded in the post were extracted and validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`. The examples still assume the `observability` namespace and TLS secrets already exist, which is acceptable for a focused snippet but should be called out if the post is expanded into a complete deployment walkthrough.
