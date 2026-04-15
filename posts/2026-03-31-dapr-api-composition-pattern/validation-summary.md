# Validation Summary: How to Implement API Composition with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, resiliency, state management)
- Node.js with Express
- Axios HTTP client
- Kubernetes (mentioned for deployment)
- Redis (as state store backend)

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency timeout policies: https://docs.dapr.io/operations/resiliency/policies/timeouts/
- Dapr Resiliency targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Store TTL: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr CLI reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Security concepts (mTLS): https://docs.dapr.io/concepts/security-concept/

## Issues Found

### 1. Resiliency spec: incorrect timeout format
**What was wrong:** The `timeouts` policy used a nested object with a `duration` field (`short-timeout: { duration: 2s }`). Dapr timeouts are simple key-value pairs.
**What was changed:** Changed to `short-timeout: 2s` (flat key-value format).
**Why:** Dapr resiliency timeout policies are defined as simple named durations, not nested objects.

### 2. Resiliency spec: incorrect `outbound` wrapper for app targets
**What was wrong:** The `targets.apps` entries used an `outbound` wrapper around `retry` and `timeout` fields. The `outbound`/`inbound` distinction applies to component targets, not app targets.
**What was changed:** Removed the `outbound` wrapper so `retry` and `timeout` are direct children of each app ID.
**Why:** For app targets in Dapr resiliency specs, policies are applied directly under the app-id without an outbound/inbound wrapper.

### 3. State TTL field placement
**What was wrong:** `ttlInSeconds` was passed as a top-level field in the state save request body (`{ key, value, ttlInSeconds: 60 }`).
**What was changed:** Moved `ttlInSeconds` inside a `metadata` object and changed the value to a string: `{ key, value, metadata: { ttlInSeconds: "60" } }`.
**Why:** Per Dapr's State Store TTL documentation, `ttlInSeconds` must be specified inside the `metadata` object, and the value must be a string.

### 4. Overstated claim about Dapr's automatic capabilities
**What was wrong:** The summary stated "Dapr handles mTLS, retries, and distributed tracing for every downstream call," implying all three are automatic. Retries require explicit resiliency configuration (as shown in the post itself), and distributed tracing requires a configured backend.
**What was changed:** Reworded to "Dapr provides automatic mTLS encryption and trace context propagation for every downstream call, and supports configurable retry policies through resiliency specs."
**Why:** Retries are not enabled by default -- they require a Resiliency spec. Tracing context is propagated automatically, but collecting traces requires additional infrastructure setup.

## Review Notes
- The service invocation URL format, `dapr run` CLI command, and state GET/POST URLs are all correct.
- The `Promise.allSettled` partial failure pattern is a sound approach and correctly implemented.
- The orders service call embeds the query string in the method path (`orders?userId=${userId}`) rather than using the `params` argument of the `invokeService` helper. This works but is inconsistent with the helper's API design. Not changed since it is functionally correct.
- The post does not specify Dapr version requirements. The resiliency feature became stable in Dapr 1.11+. Readers on older versions may need to check compatibility.
