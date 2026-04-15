# Validation Summary: How to Set Up Distributed Tracing in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, Configuration resource, service invocation API)
- Distributed Tracing (W3C Trace Context)
- Zipkin (trace backend)
- OpenTelemetry Collector (trace routing)
- Kubernetes (Deployments, Services, annotations)
- Docker (self-hosted Zipkin)

## Sources Consulted
- Dapr Configuration reference — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Tracing overview — https://docs.dapr.io/operations/observability/tracing/tracing-overview/
- Dapr OpenTelemetry Collector setup — https://docs.dapr.io/operations/observability/tracing/otel-collector/
- Dapr Zipkin setup — https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr Kubernetes annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Service Invocation API — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI reference (dapr run) — https://docs.dapr.io/reference/cli/dapr-run/
- W3C Trace Context specification — https://www.w3.org/TR/trace-context/

## Issues Found

### 1. State operations incorrectly listed as auto-traced
- **What was wrong:** The Overview section and the "How Dapr Generates Traces" section both claimed Dapr automatically generates traces for state operations alongside service invocations and pub/sub. The official Dapr tracing documentation specifically calls out service invocation and pub/sub as the primary auto-traced building blocks, but does not list state management at the same level.
- **What was changed:** Removed "state operations" from the Overview paragraph and removed "state" from the bullet point listing traced API calls in "How Dapr Generates Traces."
- **Why:** The official docs state "Tracing is used with service invocation and pub/sub APIs" without including state operations as an equivalent auto-traced feature. Including state operations overstates Dapr's automatic tracing scope.

### 2. OTEL endpoint address included `http://` scheme prefix
- **What was wrong:** The OpenTelemetry Collector configuration example used `"http://otel-collector.monitoring.svc.cluster.local:4317"` as the `endpointAddress`.
- **What was changed:** Removed the `http://` prefix, changing it to `"otel-collector.monitoring.svc.cluster.local:4317"`.
- **Why:** The official Dapr documentation examples consistently show the OTEL gRPC endpoint address without a scheme prefix (e.g., `"localhost:4317"`). Since the `protocol: grpc` field already specifies the transport, including the HTTP scheme is inconsistent with official guidance and could potentially cause issues.

## Review Notes
- The blog correctly notes that Dapr uses W3C Trace Context headers (`traceparent`) for propagation, which is confirmed by official docs.
- The Dapr Configuration resource YAML structure, Kubernetes annotations, service invocation URL format, self-hosted config path (`~/.dapr/config.yaml`), and `dapr run --config` CLI flag are all correct.
- For multi-hop tracing scenarios (A -> B -> C), developers are responsible for propagating trace headers from B to C in their application code. The blog does not mention this limitation, which could be a useful addition in the future.
- The `samplingRate: "1"` (100% sampling) is appropriate for tutorial/testing purposes but would typically be reduced in production. The blog doesn't note this, which is fine for a setup tutorial.
