# Validation Summary: How to Implement Service Versioning with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, pub/sub, metrics)
- Kubernetes (Deployments, Services, scaling)
- JavaScript / Node.js (Express, Dapr JS SDK)
- Prometheus (PromQL metrics queries)

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Kubernetes annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JS SDK GitHub: https://github.com/dapr/js-sdk
- Dapr Subscription spec reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr pub/sub subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr service invocation overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Kubernetes name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/

## Issues Found

### 1. V2 Deployment YAML missing required `selector.matchLabels` (Strategy 1)
**What was wrong:** The v2 Deployment YAML in Strategy 1 was missing the required `spec.selector.matchLabels` field. In Kubernetes `apps/v1`, the `selector` field is mandatory for Deployments and cannot be defaulted.
**What was changed:** Added `selector.matchLabels` with `app: catalog-service` and `version: v2` to match the pod template labels.
**Why:** Without this field, the Deployment would fail to create with a validation error from the Kubernetes API server.

### 2. Canary Deployment strategy was fundamentally incorrect (Strategy 3)
**What was wrong:** The original Strategy 3 suggested creating a user-defined Kubernetes Service targeting port 3500 (the Dapr sidecar HTTP port) to load-balance between v1 and v2 pods. This is incorrect because Dapr service invocation does not use user-created Kubernetes Services. Dapr's operator creates its own headless services per app-id and uses its own name resolution (via internal gRPC port 50002) for sidecar-to-sidecar communication. Port 3500 is only for local app-to-sidecar communication and is not used for inter-service traffic. Additionally, the original showed both deployments with different app-ids (catalog-service-v1/v2) which would make them separate Dapr services, not candidates for canary traffic splitting.
**What was changed:** Rewrote the section to use the correct approach: both v1 and v2 deployments share the same `dapr.io/app-id: "catalog-service"`, which causes Dapr to discover all pods through its internal headless service and distribute traffic via round-robin. Removed the incorrect user-defined Kubernetes Service YAML. Added full deployment manifests showing both versions with the shared app-id.
**Why:** The original approach would not result in any traffic splitting through Dapr service invocation. Dapr resolves services by app-id through its own name resolution, not through user-created Kubernetes Services.

### 3. Subscription CRD used deprecated `v1alpha1` API version
**What was wrong:** The pub/sub Subscription resources used `apiVersion: dapr.io/v1alpha1` with the `route` field. This API version is deprecated in favor of `dapr.io/v2alpha1`.
**What was changed:** Updated both subscriptions to `apiVersion: dapr.io/v2alpha1` and changed `route: /path` to the v2alpha1 structure using `routes.default: /path`.
**Why:** The v1alpha1 Subscription API is deprecated. While it still works, blog content should use the current recommended API version to avoid promoting deprecated patterns.

## Review Notes
- The Dapr JS SDK API (`daprClient.invoker.invoke()`) was verified as current against `@dapr/dapr` v3.6.0.
- The Dapr HTTP service invocation URL format (`/v1.0/invoke/{app-id}/method/{method}`) is correct.
- The Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are all current and correct.
- The Dapr metric `dapr_http_server_request_count` exists and the PromQL query is valid syntax.
- The canary approach using replica-count-based traffic splitting is a coarse-grained mechanism. For more precise traffic splitting, teams should consider using Dapr with a service mesh (e.g., Linkerd, Istio) or progressive delivery tools (e.g., Argo Rollouts, Flagger).
