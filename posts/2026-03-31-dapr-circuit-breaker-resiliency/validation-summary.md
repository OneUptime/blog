# Validation Summary: How to Configure Dapr Circuit Breaker with Resiliency CRD

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency CRD (Custom Resource Definition)
- Dapr Circuit Breaker policies
- Kubernetes (deployment target)
- Go (Dapr SDK example)
- Python (Dapr SDK example)
- gRPC (error handling)

## Sources Consulted
- Dapr Resiliency policies documentation: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Circuit Breaker spec: https://docs.dapr.io/operations/resiliency/policies/#circuit-breakers
- Dapr Resiliency schema reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr CLI run command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI flag deprecation (--components-path): https://github.com/dapr/cli/issues/953

## Issues Found

1. **Mermaid diagram transition label was incorrect**: The Closed-to-Open transition was labeled "failures >= maxRequests threshold", but `maxRequests` controls how many requests are allowed in the half-open state, not the trip threshold. Changed the label to "trip expression evaluates to true" to accurately reflect that the `trip` expression governs this transition.

2. **Resiliency scoping used incorrect mechanism**: The post used a `dapr.io/app-id` annotation on the Resiliency CRD metadata to scope the policy to a specific app. This is not a valid scoping mechanism for Resiliency CRDs. Fixed to use the `scopes` field at the resource root level, which is the documented approach for restricting which app sidecars load a given resiliency policy.

3. **Python example incorrectly used async context manager**: The `DaprClient` class from `dapr.clients` is synchronous and should be used with `with`, not `async with`. The `invoke_method` call is also synchronous and should not use `await`. Removed `async` and `await` keywords from the Python example.

4. **Deprecated CLI flag `--components-path`**: The `--components-path` flag is deprecated since Dapr CLI 1.13.0 in favor of `--resources-path`, which is the correct flag for loading all Dapr resource types (components, resiliency configs, subscriptions). Updated the self-hosted mode example to use `--resources-path` with a `./resources` directory.

## Review Notes
- The YAML configurations for circuit breaker policies (`maxRequests`, `interval`, `timeout`, `trip`), retry policies, and timeout policies are all correct and follow the current Dapr Resiliency spec.
- The trip expression syntax and available variables (`consecutiveFailures`, `requests`, `failures`) are accurate.
- The Go SDK example uses the correct `InvokeMethodWithContent` method signature.
- The component target structure with `outbound` for state store and pub/sub circuit breakers is correct.
- The explanation of Closed/Open/Half-Open states and the overall circuit breaker behavior is accurate.
