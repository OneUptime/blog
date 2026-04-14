# Validation Summary: How to Configure Dapr for Low-Bandwidth Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, state management, pub/sub, actors, observability)
- gRPC / Protocol Buffers
- Apache Kafka (Dapr pub/sub component)
- Kubernetes (Dapr annotations, Deployment manifests)
- Node.js (zlib compression example)
- .NET (actor runtime configuration)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr gRPC configuration: https://docs.dapr.io/operations/configuration/grpc/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Configuration CRD schema: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr tracing setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr actor runtime configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr preview features: https://docs.dapr.io/operations/configuration/preview-features/

## Issues Found

1. **`spec.metric` should be `spec.metrics` (plural)**: The telemetry configuration section used `spec.metric` which is not a valid field in the Dapr Configuration CRD. Changed to `spec.metrics` per the official schema.

2. **Metric rules structure was incorrect**: The original YAML had an invalid `rules` structure with empty `labels: []` and a fabricated `regex.operation` field. The correct Dapr metric rules format requires a `name` field (metric name) and `labels` as an array of objects with `name` and `regex` sub-fields. Since the purpose of this section is reducing telemetry bandwidth, simplified to just disable metrics entirely (`enabled: false`), which is more appropriate for low-bandwidth scenarios.

3. **Actor runtime config incorrectly placed in Configuration CRD**: The original post placed `actorIdleTimeout`, `actorScanInterval`, `drainOngoingCallTimeout`, and `drainRebalancedActors` under `spec.actor` in the Configuration CRD. The `spec.actor` field does not exist in the Dapr Configuration CRD schema. These parameters are configured programmatically through application SDKs (e.g., `AddActors()` in .NET). Rewrote the section to separate the valid CRD part (ActorStateTTL feature flag) from the SDK-level actor runtime configuration, with a .NET code example.

4. **Pub/Sub section title and description were misleading**: The section was titled "Reducing Pub/Sub Message Size" and claimed to "Configure message batching." However, the configuration only sets `maxMessageBytes` (a size cap on individual messages) and `consumeRetryInterval` (retry timing for failed consumes) — neither configures batching. Changed the title to "Tuning Pub/Sub Message Settings" and the description to "Configure message size limits."

5. **Compression metadata was misleading**: The state store compression example used `metadata: { compressed: 'gzip' }` without clarifying that this is custom application metadata, not a built-in Dapr feature. Added explanatory text clarifying that Dapr does not provide built-in compression, and that the application must handle both compression and decompression.

## Review Notes
- All Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-protocol`, `dapr.io/app-port`, `dapr.io/enable-metrics`, `dapr.io/disable-builtin-k8s-secret-store`, `dapr.io/log-level`) are correct with valid values.
- The gRPC payload size reduction claim of "30-70%" is a reasonable approximation for uncompressed payloads. In practice, uncompressed protobuf can be 60-78% smaller than JSON, though the advantage shrinks with gzip compression applied.
- The `dapr.io/app-protocol: "grpc"` annotation configures sidecar-to-app communication. Sidecar-to-sidecar communication already uses gRPC by default, so this annotation primarily benefits the app-to-sidecar channel.
- The bulk state save curl example is correct — `POST /v1.0/state/<storename>` with an array body is the proper way to save multiple state entries in a single request.
- The summary's claim of "50-80% traffic reduction" is unsubstantiated but not unreasonable as an aggregate estimate when applying all optimizations together.
