# Validation Summary: How to Use Dapr Configuration CRD

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Configuration CRD (`configurations.dapr.io`)
- Kubernetes (CRDs, pod annotations, kubectl)
- OpenTelemetry (tracing with OTLP/gRPC)
- mTLS certificate management
- HTTP middleware pipelines
- Dapr access control policies
- Dapr feature flags
- Dapr metrics configuration

## Sources Consulted
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr OpenTelemetry Collector Setup: https://docs.dapr.io/operations/observability/tracing/otel-collector/setup-otel-collector/
- Dapr mTLS Documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Metadata API Reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Middleware Documentation: https://docs.dapr.io/operations/configuration/configuration-overview/#middleware
- Dapr Access Control Documentation: https://docs.dapr.io/operations/configuration/configuration-overview/#access-control
- Dapr Metrics Configuration: https://docs.dapr.io/operations/configuration/configuration-overview/#metrics

## Issues Found

### 1. Metrics field name was incorrect (Critical)
- **What was wrong:** The post used `metric` (singular) as the spec field name.
- **What was changed:** Corrected to `metrics` (plural) to match the official Dapr Configuration CRD spec.
- **Why:** The Dapr API uses `spec.metrics`, not `spec.metric`. Using the wrong field name would cause the configuration to be silently ignored.

### 2. Metrics rules structure was completely wrong (Critical)
- **What was wrong:** The post showed a `selector` field with a `prefixes` sub-field for filtering metrics. This structure does not exist in Dapr.
- **What was changed:** Replaced with the correct structure using `name` (metric name), `labels` (array), and `regex` (map for label value transformation).
- **Why:** The real metrics rules are for regex-based label aggregation on specific named metrics, not for selecting metrics by prefix. The fabricated structure would not be recognized by Dapr.

### 3. Tracing endpoint address included HTTP scheme for gRPC (Minor)
- **What was wrong:** The `endpointAddress` was `"http://otel-collector:4317"` which includes an `http://` scheme prefix.
- **What was changed:** Corrected to `"otel-collector:4317"` (host:port only).
- **Why:** Official Dapr documentation shows gRPC endpoint addresses as `host:port` without a scheme prefix. Including `http://` for a gRPC endpoint is incorrect per the docs.

### 4. Metadata API description was misleading (Minor)
- **What was wrong:** The comment said "View the merged effective configuration for a pod" and piped through grep for "config".
- **What was changed:** Updated comment to "View runtime metadata including enabled features and active configuration name" and removed the grep pipe.
- **Why:** The `/v1.0/metadata` endpoint returns runtime metadata (app ID, enabled features, loaded components, etc.), not the full Configuration CRD spec. Describing it as showing the "merged effective configuration" is misleading.

## Review Notes
- The pod annotation `dapr.io/config` for referencing a Configuration CRD is correct.
- The mTLS, httpPipeline, accessControl, and features sections are all accurate and match official documentation.
- The post does not mention `appHttpPipeline` (for outgoing HTTP requests), which is a separate pipeline from `httpPipeline` (incoming). This is not an error, just a scope decision by the author.
- Feature flag names like `HotReload`, `ActorStateTTL`, and `SchedulerReminders` are real Dapr preview features, though availability may vary by Dapr version.
