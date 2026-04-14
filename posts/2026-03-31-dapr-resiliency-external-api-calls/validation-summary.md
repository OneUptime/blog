# Validation Summary: How to Use Dapr Resiliency for External API Calls

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Resiliency (resiliency policies: retries, timeouts, circuit breakers)
- Dapr Output Bindings (bindings.http)
- Dapr Service Invocation API
- Python (requests library)
- Kubernetes (kubectl)

## Sources Consulted
- Dapr Resiliency spec documentation (https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- Dapr Resiliency policy specs — retries, timeouts, circuit breakers (https://docs.dapr.io/operations/resiliency/policies/)
- Dapr HTTP binding component reference (https://docs.dapr.io/reference/components-reference/supported-bindings/http/)
- Dapr Bindings API reference (https://docs.dapr.io/reference/api/bindings_api/)
- Dapr Service Invocation API reference (https://docs.dapr.io/reference/api/service_invocation_api/)
- Dapr Resiliency targets spec (https://docs.dapr.io/operations/resiliency/targets/)

## Issues Found

1. **Invalid retry policy field `initialInterval`**: The exponential retry policy in Dapr does not have an `initialInterval` field. The correct field name is `duration`, which specifies the initial interval between retries for exponential backoff. Changed `initialInterval: 2s` to `duration: 2s`.

2. **Missing `outbound` wrapper in component resiliency target**: Dapr resiliency targets for components require an `outbound` (or `inbound`) wrapper key. For output bindings, the `outbound` key is required to indicate the direction of calls (from sidecar to the component). The blog had policies applied directly under `targets.components.stripe-payment`, which is invalid. Added the required `outbound:` wrapper so the structure is `targets.components.stripe-payment.outbound.retry/timeout/circuitBreaker`.

## Review Notes
- The `trip: consecutiveFailures >= 5` expression uses `>=` while the Dapr docs default example uses `> 5`. Both are valid CEL expressions but have different semantics (`>= 5` triggers on the 5th consecutive failure, `> 5` triggers on the 6th). The blog's choice is intentional and valid.
- The Python code imports `json` but never uses it. This is a minor linting issue, not a functional error, so it was left unchanged.
- The `MTLSRootCA` metadata field in the HTTP binding is set to an empty string. This is valid — the field is optional and an empty value effectively disables mTLS for the binding.
