# Validation Summary: How to Implement Serverless API with Dapr Service Invocation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation building block, state store API, resiliency policies)
- Knative Serving (scale-to-zero, autoscaling annotations)
- Kubernetes
- Node.js / Express
- Go (Dapr Go SDK)
- Istio VirtualService (API gateway routing)

## Sources Consulted
- Dapr sidecar injection documentation — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr service invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr state management API reference — https://docs.dapr.io/reference/api/state_api/
- Dapr Go SDK client interface — https://github.com/dapr/go-sdk (Client.InvokeMethod signature)
- Dapr resiliency spec — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr retry policies — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Knative autoscaling annotations — https://knative.dev/docs/serving/autoscaling/
- Knative Service spec — https://knative.dev/docs/reference/api/serving-api/

## Issues Found

### 1. Dapr sidecar annotations placed on wrong YAML level (Critical)
**What was wrong:** The Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) were placed on the top-level Knative Service `metadata.annotations`. Dapr's sidecar injector is a Kubernetes mutating admission webhook that operates at the pod level — it only inspects pod template annotations, not resource-level annotations.

**What was changed:** Moved the three Dapr annotations from the top-level `metadata.annotations` to `spec.template.metadata.annotations` (the pod template), alongside the Knative autoscaling annotations.

**Why:** Without this fix, deploying the YAML would create a Knative Service with no Dapr sidecar injected into its pods, meaning all Dapr API calls (state store, service invocation) would fail with connection errors.

### 2. Knative autoscaling annotations used incorrect format (Moderate)
**What was wrong:** The annotations `autoscaling.knative.dev/minScale` and `autoscaling.knative.dev/maxScale` used camelCase. The canonical Knative annotation names use kebab-case: `min-scale` and `max-scale`.

**What was changed:** Renamed `minScale` to `min-scale` and `maxScale` to `max-scale`.

**Why:** The camelCase variants are from early Knative versions and may be silently ignored by current Knative autoscaler implementations, causing the service to use default scaling limits instead of the intended 0-50 range.

## Review Notes
- The Istio VirtualService uses `networking.istio.io/v1alpha3`, which still works but is being superseded by `networking.istio.io/v1` in Istio 1.22+. Not changed since v1alpha3 remains supported.
- The Go SDK code discards the error from `dapr.NewClient()` with `client, _ := dapr.NewClient()`. This is acceptable for a tutorial snippet but production code should handle the error.
- The Node.js code uses the global `crypto.randomUUID()` which requires Node.js 19+. Not flagged since this is the modern standard.
- The Dapr resiliency configuration is correct per the official schema. The `duration` field serves as the initial backoff interval for exponential retry policies.
