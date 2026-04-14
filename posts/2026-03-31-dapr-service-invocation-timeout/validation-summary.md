# Validation Summary: How to Configure Dapr Service Invocation Timeout

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) — Resiliency API
- YAML (Resiliency resource configuration)
- Python (requests library)
- Go (net/http, context)
- Node.js (axios)
- Kubernetes (kubectl)
- Prometheus (metrics querying)

## Sources Consulted
- Dapr Resiliency Overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies — https://docs.dapr.io/operations/resiliency/policies/
- Dapr Service Invocation API — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/
- Dapr Resiliency Targets — https://docs.dapr.io/operations/resiliency/targets/

## Issues Found

1. **Incorrect self-hosted file path**: The post instructed copying the resiliency YAML to `~/.dapr/resiliency/`, which is not a valid default Dapr directory. Dapr loads resiliency specs from the resources path, which defaults to `~/.dapr/components/` in self-hosted mode. Fixed the path to `~/.dapr/components/`.

2. **Incorrect retry + timeout calculation**: The post stated the maximum total time was "approximately 12 seconds (3 attempts x 3s timeout + 2 x 1s delay)". With `maxRetries: 3`, Dapr performs 1 initial attempt + 3 retries = 4 total attempts, with 3 delays between them. The correct maximum is approximately 15 seconds (4 x 3s + 3 x 1s). Fixed the explanation and math.

3. **Invalid `all` keyword in targets.apps**: The scoping section used `all` as a target app ID, implying it would match all apps. Dapr does not support an `all` wildcard in `targets.apps` — apps must be listed individually by their app ID. Replaced with explicit example app IDs (`order-service`, `payment-service`).

## Review Notes
- The `apiVersion: dapr.io/v1alpha1` and `kind: Resiliency` are correct for the current Dapr resiliency spec.
- The Dapr HTTP invocation URL pattern `/v1.0/invoke/{appId}/method/{method}` is correct.
- All three code examples (Python, Go, Node.js) are syntactically correct and demonstrate proper client-side timeout handling.
- The `dapr_resiliency_count` metric name is correct per Dapr's observability documentation.
- The error response format (`ERR_DIRECT_INVOKE` with "context deadline exceeded") is accurate for timeout scenarios.
- The Resiliency feature was introduced in preview in Dapr 1.7 and became stable in 1.9; the "Dapr 1.7+" prerequisite is acceptable.
