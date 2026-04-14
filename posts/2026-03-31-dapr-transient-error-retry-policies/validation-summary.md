# Validation Summary: How to Handle Transient Errors with Dapr Retry Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Resiliency API (v1alpha1)
- Dapr retry policies (constant and exponential)
- Dapr circuit breakers
- Dapr Python SDK (`dapr-client`)
- Dapr CLI (`dapr logs`)
- Kubernetes (deployment context)

## Sources Consulted
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry Policies Overview: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Circuit Breaker Policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Python SDK Client Documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/

## Issues Found

### 1. `gRPCStatusCodes` used string names instead of numeric codes
- **What was wrong:** The `matching.gRPCStatusCodes` field was set to `"UNAVAILABLE,DEADLINE_EXCEEDED"` (string names). The Dapr documentation specifies this field accepts a comma-separated string of numeric gRPC status codes or code ranges, not symbolic names.
- **What was changed:** Replaced `"UNAVAILABLE,DEADLINE_EXCEEDED"` with `"4,14"` (where 4 = DEADLINE_EXCEEDED and 14 = UNAVAILABLE).
- **Why:** The Dapr resiliency schema requires numeric gRPC status codes (e.g., `"4,8-11,13,14"`), consistent with how `httpStatusCodes` uses numeric HTTP codes.

### 2. `initialInterval` and `multiplier` are not valid retry policy fields
- **What was wrong:** The exponential retry example included `initialInterval: 500ms` and `multiplier: 2`. These fields are not part of the documented Dapr Resiliency YAML schema. The documented fields for exponential retry are: `policy`, `maxInterval`, `maxRetries`, and `matching`.
- **What was changed:** Removed `initialInterval: 500ms` and `multiplier: 2` from the exponential retry example, keeping only the valid fields (`policy`, `maxInterval`, `maxRetries`).
- **Why:** Per the official Dapr resiliency documentation, exponential backoff behavior (initial interval, multiplier, jitter) is handled internally by Dapr's backoff algorithm. Only `maxInterval` is exposed to cap the maximum delay between retries.

## Review Notes
- The "Testing Retry Behavior" section describes circuit breakers as "built-in fault injection." Dapr does not have a dedicated fault injection feature — the section demonstrates using a circuit breaker, which is technically correct configuration but slightly misleading framing. This is a content clarity issue, not a technical error.
- The circuit breaker `trip` expressions use `>=` (e.g., `consecutiveFailures >= 3`) while the official docs show examples with `>` (e.g., `consecutiveFailures > 5`). Both are valid CEL expressions with different semantics — `>=` triggers at exactly N failures while `>` triggers after more than N. Left as-is since both operators are valid.
- The Python SDK code uses keyword arguments (`app_id=`, `method_name=`, etc.) which is correct per the SDK's method signature, though the official docs typically show positional arguments.
- The `dapr logs --app-id order-service --kubernetes` CLI command was verified as correct.
