# Validation Summary: How to Use Dapr HTTPEndpoint CRD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTPEndpoint CRD (Custom Resource Definition)
- Dapr Service Invocation API
- Dapr Resiliency CRD
- Dapr JavaScript SDK (`@dapr/dapr`)
- Kubernetes (kubectl, Secrets, CRDs)

## Sources Consulted
- Dapr Resiliency Targets documentation: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Schema spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr HTTPEndpoint invocation guide: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-non-dapr-endpoints/
- Dapr Resiliency API types (source code): https://github.com/dapr/dapr/blob/master/pkg/apis/resiliency/v1alpha1/types.go

## Issues Found
1. **Incorrect resiliency target type `httpEndpoints`**: The resiliency YAML example used `targets.httpEndpoints` as the target type, but Dapr's resiliency spec only supports three target types: `apps`, `components`, and `actors`. There is no `httpEndpoints` target type — confirmed by both official documentation and Dapr's source code (`Targets` struct in `types.go`). Since HTTPEndpoint names function as pseudo-app-ids in Dapr's service invocation API, the correct target type is `targets.apps`. Changed `targets.httpEndpoints` to `targets.apps`.

## Review Notes
- The `trip` expression in the circuit breaker uses `consecutiveFailures >= 5` (greater-than-or-equal), while Dapr's documented default is `consecutiveFailures > 5` (strict greater-than). Both are valid CEL expressions, so this is not an error — just a slightly different threshold choice (trips at 5 instead of 6 consecutive failures).
- The `scopes` field is correctly placed at the top level (sibling to `spec`, not nested under it), matching the official HTTPEndpoint CRD schema.
- The JavaScript SDK usage of `daprClient.invoker.invoke(appId, method, HttpMethod.POST, body)` is correct per the official SDK documentation.
- The service invocation URL pattern `http://localhost:3500/v1.0/invoke/{name}/method/{path}` is correct for HTTPEndpoint invocation.
