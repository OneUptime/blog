# Validation Summary: Beyla vs OpenTelemetry Auto-Instrumentation: How to Choose

## Status
validated

## Post Type
Technical comparison and decision guide

## Technologies Covered
- Grafana Beyla
- OpenTelemetry zero-code and language auto-instrumentation
- OpenTelemetry Operator for Kubernetes
- eBPF, Linux kernel BTF, and Linux capabilities
- Kubernetes DaemonSets and sidecars
- OTLP, Grafana Tempo, and Grafana Alloy
- HTTP, HTTPS, HTTP/2, and gRPC
- PostgreSQL, MySQL, SQL clients, Redis, and MongoDB
- Kafka messaging
- .NET, Java, Node.js, Python, and Go auto-instrumentation

## Sources Consulted
- [Grafana Beyla overview, compatibility matrix, requirements, and limitations](https://grafana.com/docs/beyla/latest/)
- [Grafana Beyla Kubernetes deployment modes](https://grafana.com/docs/beyla/latest/setup/kubernetes/)
- [Grafana Beyla Docker deployment and PID namespace requirements](https://grafana.com/docs/beyla/latest/setup/docker/)
- [Grafana Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Grafana Beyla supported metric and trace instrumentations](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Grafana Beyla distributed tracing and context propagation](https://grafana.com/docs/beyla/latest/distributed-traces/)
- [Grafana Beyla instrumentation controls](https://grafana.com/docs/beyla/latest/configure/controlling-instrumentation/)
- [Grafana Beyla service discovery and OpenTelemetry-instrumented service exclusion](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Grafana Beyla request-time measurement](https://grafana.com/docs/beyla/latest/requesttime/)
- [Grafana Cloud Application Observability metrics generation and deduplication](https://grafana.com/docs/grafana-cloud/platform/knowledge-graph/get-started/manage-datasets/application/application-metrics/)
- [Grafana Tempo metrics-generator filtering](https://grafana.com/docs/tempo/latest/configuration/#filter-policies)
- [Grafana Alloy span-metrics connector](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.connector.spanmetrics/)
- [Grafana Alloy service-graph connector](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.connector.servicegraph/)
- [OpenTelemetry zero-code instrumentation concepts](https://opentelemetry.io/docs/concepts/instrumentation/zero-code/)
- [OpenTelemetry zero-code instrumentation language index](https://opentelemetry.io/docs/zero-code/)
- [OpenTelemetry Operator automatic instrumentation](https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/)
- [OpenTelemetry language API and SDK status](https://opentelemetry.io/docs/languages/)

## Issues Found
1. **Host PID visibility was presented as a universal Beyla requirement.** Beyla needs visibility into each target process, but that does not always mean access to the host PID namespace. A node-wide Kubernetes DaemonSet requires `hostPID: true`; a Kubernetes sidecar can instead use a shared pod process namespace, and a Docker deployment can share the target container's PID namespace. The operating-constraints paragraph and decision sequence were corrected to say "target-process visibility."
2. **`span.metrics.skip=true` was described as if it automatically controlled any Tempo or Alloy generator.** Grafana Cloud Tempo honors this resource attribute only when its deduplication option is configured accordingly, while standard self-managed Tempo, OpenTelemetry Collector, and Alloy metrics-generation paths do not treat it as a universal OpenTelemetry switch. The post now gives the documented Grafana Cloud behavior and tells self-managed users to filter those SDK spans from the metrics-generation path or disable the competing generator.

## Review Notes
- The Operator can inject Go auto-instrumentation, as stated, but the current Go path requires the disabled-by-default `enable-go-instrumentation` feature gate and a valid `OTEL_GO_AUTO_TARGET_EXE`. The post's high-level statement remains accurate because it says the Operator "can" inject Go and already notes that maturity and requirements vary.
- Beyla's generic network-level context propagation is disabled by default and must be enabled explicitly. Once enabled, its documented HTTP/2, gRPC, HTTPS, and L7-proxy limitations match the post.
- Beyla documents Kafka client/server metrics and traces, but this should not be interpreted as a guarantee of producer-to-consumer trace-context propagation through Kafka. The post does not make that stronger claim.
- The support matrix and language-specific behavior are version-sensitive; the review used the current official documentation available on 2026-08-30.
