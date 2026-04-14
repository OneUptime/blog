# Validation Summary: How to Write Dapr Resiliency YAML Specifications

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency specifications (v1alpha1)
- YAML configuration
- Kubernetes (kubectl)
- Circuit breaker pattern
- Retry policies (constant and exponential backoff)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Circuit Breaker Policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Kit retry source code (Config struct): https://github.com/dapr/kit/blob/main/retry/retry.go
- Dapr resiliency source code: https://github.com/dapr/dapr/blob/master/pkg/resiliency/retry.go

## Issues Found
1. **Inaccurate description of exponential backoff behavior (line 65)**: The post stated that exponential retry "doubles the wait up to `maxInterval`". Dapr's default exponential backoff multiplier is 1.5 (from the cenkalti/backoff library), not 2. While the post's code example explicitly sets `multiplier: 2`, the general description of the policy type should not claim "doubles" since this is only true when the multiplier is explicitly set to 2. Changed to: "increases the wait by a configurable multiplier (default 1.5) up to `maxInterval`".

## Review Notes
- The post correctly uses `consecutiveFailures >= 5` in trip expressions. Both `>=` and `>` are valid CEL syntax; the Dapr docs use both forms in different examples.
- The `initialInterval` and `multiplier` fields shown in the exponential retry YAML example are valid — confirmed in the Dapr Kit `retry.Config` struct source code, which maps these fields via `mapstructure` tags.
- The post does not mention the `actors` target type or the `inbound` sub-key for components, but this is acceptable for a tutorial focused on common use cases.
- The post does not mention the `matching` field (for filtering retries by HTTP/gRPC status codes) or `maxElapsedTime`, but these are advanced features and their omission does not affect correctness.
