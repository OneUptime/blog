# Validation Summary: How to Call Non-Dapr Endpoints from a Dapr Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (HTTPEndpoint component, Service Invocation, Resiliency)
- Kubernetes (kubectl apply)
- Go (Dapr Go SDK)
- HTTP/REST (curl)
- YAML (component and resiliency configuration)

## Sources Consulted
- Dapr HTTPEndpoint resource spec: https://docs.dapr.io/reference/resource-specs/httpendpoints-schema/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr How-To: Invoke Non-Dapr Endpoints: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-non-dapr-endpoints/
- Dapr Go SDK client reference: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Resiliency overview and spec: https://docs.dapr.io/operations/resiliency/resiliency-overview/

## Issues Found

### 1. Resiliency target field names were incorrect
- **What was wrong:** The resiliency spec used `retryPolicy` and `circuitBreakerPolicy` as field names under targets. The correct Dapr resiliency field names are `retry` and `circuitBreaker`.
- **What was changed:** Renamed `retryPolicy: retryThrice` to `retry: retryThrice` and `circuitBreakerPolicy: openOnErrors` to `circuitBreaker: openOnErrors`.

### 2. Missing circuit breaker policy definition
- **What was wrong:** The resiliency YAML referenced a circuit breaker policy named `openOnErrors` but never defined it in the `spec.policies` section. This would cause a runtime error.
- **What was changed:** Added a `circuitBreakers` section under `policies` with a complete `openOnErrors` definition including `maxRequests`, `interval`, `timeout`, and `trip` fields.

### 3. Go SDK import alias not shown
- **What was wrong:** The Go code snippet used `dapr.NewClient()` and `dapr.DataContent`, but the Go SDK package is `github.com/dapr/go-sdk/client` (package name `client`, not `dapr`). Without an explicit import alias, the code would not compile.
- **What was changed:** Added `import dapr "github.com/dapr/go-sdk/client"` to the code snippet to show the required alias.

## Review Notes
- The HTTPEndpoint component spec (apiVersion, kind, baseUrl, headers with secretKeyRef) is correct per official Dapr documentation.
- The service invocation URL pattern `/v1.0/invoke/{name}/method/{path}` is correct for HTTPEndpoint resources.
- The `httpEndpoints` target type in resiliency was introduced in Dapr 1.14+. The post does not mention version requirements, which could be noted in a future update.
