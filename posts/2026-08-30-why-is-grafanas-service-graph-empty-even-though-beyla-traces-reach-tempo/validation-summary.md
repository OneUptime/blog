# Validation Summary: Why Is Grafana's Service Graph Empty Even Though Beyla Traces Reach Tempo?

## Status
validated

## Post Type
Troubleshooting and configuration guide

## Technologies Covered
- Grafana Service Graph and Tempo data source provisioning
- Grafana Tempo 3.x metrics-generator
- Grafana Alloy `otelcol.connector.servicegraph` and `otelcol.exporter.loadbalancing`
- Grafana Beyla distributed tracing and service-graph metrics
- Prometheus remote write and PromQL
- OpenTelemetry trace relationships and resource attributes
- W3C Trace Context

## Sources Consulted
- [Grafana Service Graph and Service Graph view](https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/) - graph metric requirements, metric names, and the distinction between the node graph and the span-metrics table.
- [Enable Grafana Tempo service graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/enable-service-graphs/) - supported Tempo and Alloy generation paths and Grafana data source linkage.
- [Grafana Tempo service graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/) - edge pairing, span kinds, database and messaging classification, virtual nodes, labels, and generated metrics.
- [Grafana Tempo configuration reference](https://grafana.com/docs/tempo/latest/configuration/) - `metrics_generator`, remote-write storage, service-graph processor settings, and scoped overrides.
- [Grafana Tempo deployment modes](https://grafana.com/docs/tempo/latest/reference-tempo-architecture/deployment-modes/) - monolithic and Tempo 3.x microservices component behavior.
- [Kafka in the Tempo architecture](https://grafana.com/docs/tempo/latest/reference-tempo-architecture/components/kafka/) - trace-ID partitioning, the metrics-generator consumer group, and top-level `ingest` configuration.
- [Troubleshoot the Tempo metrics-generator](https://grafana.com/docs/tempo/latest/troubleshooting/metrics-generator/) - expired-edge and dropped-span diagnostic metrics, `wait`, and `max_items`.
- [Grafana Alloy `otelcol.connector.servicegraph`](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.connector.servicegraph/) - connector inputs, outputs, store limits, labels, and metric names.
- [Grafana Alloy `otelcol.exporter.loadbalancing`](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.loadbalancing/) - trace-ID routing and the remaining duplicate-series problem when scaling service-graph connectors.
- [Configure Grafana Beyla metric exports](https://grafana.com/docs/beyla/latest/configure/export-data/) - the `application_service_graph` feature and OTLP or Prometheus export paths.
- [Deploy Beyla for Grafana Cloud Application Observability](https://grafana.com/docs/beyla/latest/setup/kubernetes-helm-appolly/) - confirmation that Beyla can generate service-graph metrics directly without Tempo's metrics-generator or trace generation.
- [Distributed traces with Grafana Beyla](https://grafana.com/docs/beyla/latest/distributed-traces/) - W3C `traceparent` propagation and the documented TLS, proxy, HTTP/2, gRPC, and Go-specific constraints.
- [Configure Grafana Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/) - `service.name` resolution from OpenTelemetry resource settings and Kubernetes metadata.
- [Prometheus remote-write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) - the `send_exemplars` field.
- [Prometheus command-line reference](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/) - the `--web.enable-remote-write-receiver` flag.
- [OpenTelemetry Trace API specification](https://opentelemetry.io/docs/specs/otel/trace/api/) - remote parent context and client/server span relationships.
- [OpenTelemetry service resource semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/) - `service.name` identity requirements and defaults.
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) - `traceparent` structure and cross-process context propagation.

## Issues Found
1. **Beyla was omitted as a supported service-graph generator.** The post presented Tempo and Alloy as the only generation paths even though current Beyla can emit Grafana-compatible service-graph metrics with `application_service_graph`. Added the Beyla option, expanded the duplicate-series warning to all three generators, and generalized the diagnostic and conclusion language to cover OTLP export and Prometheus scraping as well as remote write.
2. **The Tempo configuration omitted a Tempo 3.x microservices deployment requirement.** The YAML fields were valid, but a microservices deployment must also run the `metrics-generator` target and provide the shared top-level Kafka `ingest` configuration. Added this deployment-specific caveat while preserving the monolithic `target=all` behavior.
3. **Client/server pairing was stated as a universal service-graph requirement and the relationship check was too vague.** Correlated `CLIENT`/`SERVER` spans are required for a direct request edge between two instrumented services, but Tempo also supports producer/consumer, database, and virtual-node edges. Scoped the claim to direct request edges and replaced the “plausible” relationship check with the exact requirement that the server span's parent span ID equal the client span's span ID.
4. **The horizontally scaled Alloy guidance described trace-aware load balancing as a complete solution.** Added the required `routing_key = "traceID"` setting and documented that it only preserves trace affinity: separate connector instances can still generate identical Prometheus series. Added the documented remedies of a per-collector label plus aggregation or using Tempo's metrics-generator.
5. **Database, messaging, and virtual nodes were conflated.** Replaced “virtual database or messaging nodes” with distinct database, messaging, and virtual-node edge terminology, matching Tempo's documented connection types.

## Review Notes
- Both YAML snippets are syntactically valid and use current field names. `serviceMap.datasourceUid` correctly references the Prometheus data source UID rather than its name or URL.
- The PromQL expression and all three metric names in the post are current and valid. A five-minute `rate` window is valid even though some official troubleshooting examples use one minute.
- `send_exemplars: true` remains a valid Prometheus remote-write option. A self-hosted Prometheus receiver needs `--web.enable-remote-write-receiver`; retaining exemplars additionally requires exemplar storage to be enabled, but exemplars are not required to draw the graph.
- The configured `service-graphs` processor is sufficient for the node graph discussed in the post. Grafana's accompanying Service Graph view table also needs span metrics; that table is outside the post's empty-node-graph scope.
- Beyla's generic network-level propagation is disabled by default. When enabled, its HTTPS propagation requires Beyla at both ends and is disrupted by L7 proxies or load balancers; that path does not support HTTP/2 or gRPC. The separate Go library-level mechanism has different kernel constraints. The post's propagation warning is accurate.
- The review used the current documentation available on 2026-08-30. Tempo, Grafana, Alloy, and Beyla behavior is version-sensitive, so their linked `latest` documentation should be rechecked during future updates.
