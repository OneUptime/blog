# Validation Summary: How to Use Dapr Service Invocation with Circuit Breakers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Resiliency API
- Dapr Service Invocation
- Circuit Breaker pattern (via Sony gobreaker library)
- Kubernetes (for applying resiliency resources)
- Node.js / JavaScript (axios HTTP client)
- Prometheus metrics

## Sources Consulted
- Dapr Resiliency policies documentation: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency schema reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr source code (pkg/resiliency/breaker/circuitbreaker.go, pkg/api/http/responses.go) for HTTP status code verification
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/

## Issues Found

1. **Incorrect HTTP status code for circuit breaker errors**: The post claimed Dapr returns HTTP 503 when a circuit breaker is open. Investigation of the Dapr source code shows that when the gobreaker library returns `ErrOpenState`, it is wrapped as an internal error that maps to HTTP 500, not 503. Fixed the code example from `err.response?.status === 503` to `err.response?.status === 500`, and updated the summary paragraph to remove the specific 503 reference.

2. **Incorrect metrics grep pattern**: The post used `grep circuit_breaker` to filter Dapr metrics, but the actual Dapr circuit breaker metric is named `dapr_resiliency_cb_state` (not `circuit_breaker`). The grep pattern `circuit_breaker` would return no results. Fixed to `grep dapr_resiliency_cb`.

## Review Notes
- The `trip` expression `consecutiveFailures >= 5` is valid CEL syntax and will work correctly. The Dapr docs commonly show examples with `>` (e.g., `consecutiveFailures > 5`), but `>=` is equally valid — just triggers one failure earlier. This is a stylistic choice, not an error.
- The Resiliency YAML schema (`apiVersion: dapr.io/v1alpha1`, `kind: Resiliency`, field names `maxRequests`, `interval`, `timeout`, `trip`, `circuitBreaker`, `retry`) is all correct per the official schema reference.
- The service invocation URL pattern `http://localhost:3500/v1.0/invoke/{app-id}/method/{method-name}` is correct.
- The description of circuit breaker states (Closed, Open, Half-open) is accurate.
- The default Dapr metrics port 9090 is correct.
