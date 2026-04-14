# Validation Summary: How to Apply Resiliency Policies to Service Invocation in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency policies (timeouts, retries, circuit breakers)
- Dapr Service Invocation building block
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Python SDK (`dapr-client`)
- Kubernetes
- Prometheus metrics

## Sources Consulted
- Dapr Resiliency spec documentation (https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- Dapr Resiliency policy spec (https://docs.dapr.io/operations/resiliency/policies/)
- Dapr CRD type definitions (`v1alpha1/types.go` in dapr/dapr GitHub repo)
- Dapr JavaScript SDK documentation and source code (https://docs.dapr.io/developing-applications/sdks/js/)
- Dapr Python SDK source code — `invoke_method` signature in gRPC client
- Dapr resiliency metrics source code (`pkg/diagnostics/resiliency_monitoring.go`)

## Issues Found

### 1. JavaScript SDK: Missing `HttpMethod` import (High severity)
- **What was wrong:** The code used `HttpMethod.POST` but only imported `DaprClient` from `@dapr/dapr`. This would cause a `ReferenceError` at runtime since `HttpMethod` was undefined.
- **What was changed:** Updated the import to `const { DaprClient, HttpMethod } = require('@dapr/dapr');`.
- **Why:** `HttpMethod` is a named export from the `@dapr/dapr` package and must be explicitly imported.

### 2. Python SDK: Missing `import json` and `http_verb` parameter (Medium severity)
- **What was wrong:** The Python snippet used `json.dumps()` without importing the `json` module. Additionally, `invoke_method` was called without specifying `http_verb='POST'`, which defaults to GET — inappropriate for a payment charge endpoint that mutates state.
- **What was changed:** Added `import json` at the top of the snippet and added `http_verb='POST'` to the `invoke_method` call.
- **Why:** The `json` module must be imported, and the Dapr Python SDK defaults `http_verb` to None/GET, so POST must be specified explicitly for state-mutating operations.

## Review Notes
- The retry policy fields `initialInterval`, `multiplier`, and `randomizationFactor` are functional in Dapr (used internally via pass-through decoding to the retry config struct) but are not prominently documented in the official Dapr resiliency docs. They work correctly but could potentially change without notice. The official docs typically only show `policy`, `duration`, `maxInterval`, and `maxRetries`.
- The circuit breaker `trip` expression uses `consecutiveFailures >= 5` while official Dapr examples tend to use `>` (strictly greater than). Both are valid CEL expressions. The blog text says "after 5 consecutive failures" which is consistent with `>= 5` (trips on the 5th failure), so this is internally consistent.
- The Prometheus metrics section shows simplified label sets. Real `dapr_resiliency_count` metrics include additional labels like `resiliency_name`, `namespace`, `flow_direction`, `target`, and `status`. The simplification is acceptable for a blog post but readers may need to adjust queries for real usage.
- The description of `dapr_resiliency_count` with `policy="circuitbreaker"` as "circuit trips" is a slight simplification — this metric counts policy executions, not specifically state transitions. For circuit breaker state specifically, `dapr_resiliency_activations_total` or `dapr_resiliency_cb_state` may be more precise.
