# Validation Summary: How to Implement Circuit Breaker Threshold Configuration with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Resiliency spec, Configuration API, Go SDK)
- Go (`github.com/dapr/go-sdk/client`)
- sony/gobreaker circuit breaker library
- Redis (as Dapr configuration store)
- Kubernetes (implied by YAML manifests)

## Sources Consulted
- Dapr Resiliency spec documentation (https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- Dapr Configuration API documentation (https://docs.dapr.io/developing-applications/building-blocks/configuration/)
- Dapr Redis Configuration store component docs (https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/)
- Dapr Go SDK source — `client.Client` interface, `SubscribeConfigurationItems` method signature (https://github.com/dapr/go-sdk)
- Dapr components-contrib Redis configuration store source — `GetRedisValueAndVersion` in `configuration/redis/internal/redis_value.go` (https://github.com/dapr/components-contrib)
- sony/gobreaker source — `Settings`, `Counts`, `CircuitBreaker.Execute` (https://github.com/sony/gobreaker)

## Issues Found

### 1. Incorrect Redis key format for Dapr Configuration store
- **What was wrong:** Redis keys were prefixed with `cb-config||` (e.g., `"cb-config||payment-service:consecutiveFailures"`). The `||` separator is used in Dapr's Redis configuration store as a *value* separator (between value and version), not as part of the key. The component name (`cb-config`) is a Dapr-level abstraction and does not appear in the Redis key.
- **What was changed:** Removed the `cb-config||` prefix from all Redis keys in both the "Storing Threshold Config in Redis" and "Adjusting Thresholds at Runtime" sections. Keys are now plain names like `"payment-service:consecutiveFailures"`.
- **Why:** Dapr's Redis configuration store looks up keys by their plain name. The store name is only used by the Dapr SDK to route to the correct component.

### 2. Incorrect Redis value format
- **What was wrong:** Redis values were stored as plain strings (e.g., `"5"`). Dapr's Redis configuration store expects values in `value||version` format, where `||` separates the configuration value from its version string.
- **What was changed:** Updated all Redis values to use the `value||` format (e.g., `"5||"`), with an empty version suffix.
- **Why:** The `GetRedisValueAndVersion` function in Dapr's Redis configuration store implementation splits values on `||` to extract the value and version. Using the correct format ensures proper parsing.

## Review Notes
- The Resiliency YAML uses `trip: consecutiveFailures >= 5` which trips at exactly 5 failures. The Dapr docs default example uses `consecutiveFailures > 5` (strict greater-than, tripping at 6). The blog's choice is valid but behaves slightly differently from the Dapr default.
- The Go code ignores the `(string, error)` return values from `SubscribeConfigurationItems`. While valid Go, production code should handle the error return to detect subscription failures.
- The `SubscribeConfigurationItems` call relies on Redis keyspace notifications being enabled (`notify-keyspace-events` must include `K` and `g` or `$` flags). The post does not mention this prerequisite, which could trip up readers.
- The `gobreaker` library APIs and the Dapr Go SDK APIs used are all current and correct.
