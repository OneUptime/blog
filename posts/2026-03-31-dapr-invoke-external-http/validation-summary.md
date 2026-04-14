# Validation Summary: How to Invoke External HTTP Endpoints Through Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (HTTPEndpoint component, service invocation API)
- Dapr Resiliency policies
- Kubernetes (secrets, kubectl)
- Python (requests library)
- Stripe API (used as example external service)

## Sources Consulted
- Dapr HTTPEndpoint spec: https://docs.dapr.io/reference/resource-specs/httpendpoints-schema/
- Dapr service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr invoking non-Dapr endpoints: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-non-dapr-endpoints/
- Dapr resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr resiliency targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr resiliency schema: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Stripe API authentication docs: https://stripe.com/docs/api/authentication

## Issues Found

1. **Resiliency policy field names were incorrect.** The blog used `retryPolicy` and `timeoutPolicy` as field names under `spec.targets.httpEndpoints.stripe-api`. Per the Dapr resiliency schema, the correct field names are `retry` and `timeout`. Changed `retryPolicy: retryThrice` to `retry: retryThrice` and `timeoutPolicy: fiveSeconds` to `timeout: fiveSeconds`.

2. **Section title "Using the Python SDK" was misleading.** The code example uses the standard `requests` library to call the Dapr HTTP API directly, not the Dapr Python SDK (`dapr-client`). Renamed the section to "Using Python" to accurately describe the approach.

3. **Stripe Authorization header value missing Bearer prefix.** The Kubernetes secret was created with `--from-literal=api-key="sk_live_xxxx"`, but Stripe's API expects the Authorization header value to include the `Bearer ` prefix (i.e., `Bearer sk_live_xxxx`). Since Dapr injects the secret value as-is into the header, the secret must contain the full token string. Changed to `--from-literal=api-key="Bearer sk_live_xxxx"`.

## Review Notes
- The HTTPEndpoint component YAML, service invocation URL pattern (`/v1.0/invoke/{name}/method/{path}`), TLS configuration, and retry/timeout policy definitions are all correct per official Dapr documentation.
- The `httpEndpoints` resiliency target type may not appear in all versions of the Dapr resiliency documentation. It was introduced in newer Dapr versions (1.14+). Authors targeting older Dapr versions should verify support.
- The post uses `requests` library for the Python example, which is perfectly valid but could be enhanced in the future with a Dapr SDK example using `DaprClient` for consistency with Dapr best practices.
