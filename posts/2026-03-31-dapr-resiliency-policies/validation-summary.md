# Validation Summary: How to Understand Dapr Resiliency Policies

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency Policies (retries, timeouts, circuit breakers)
- Dapr Sidecar architecture
- Kubernetes (for deployment)
- YAML configuration

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr CLI Reference: https://docs.dapr.io/reference/cli/
- Dapr circuit breaker implementation (Sony gobreaker library)

## Issues Found

1. **Exponential backoff fields not configurable**: The post listed `initialInterval`, `multiplier`, and `randomizationFactor` as configurable YAML fields for exponential retry policies. Per official Dapr documentation, only `maxInterval` and `maxRetries` are configurable. The multiplier is hardcoded at 1.5x with a randomization range of 0.5 to 1.5. Removed the non-configurable fields from the YAML example.

2. **"Doubles the wait time" description inaccurate**: The exponential backoff description said it "doubles the wait time after each failure." The actual multiplier is 1.5x (not 2x), with randomized jitter. Changed the description to accurately reflect the 1.5x multiplier with jitter.

3. **Non-existent CLI command**: The post included `dapr resiliency --app-id myapp` as a command to verify resiliency configuration. This command does not exist in the Dapr CLI. Replaced with guidance to check Dapr logs or dashboard for loaded resiliency configuration.

4. **Incomplete circuitBreakerScope values**: The post listed only `"id"` and `"type"` as valid values for `circuitBreakerScope`. The value `"both"` is also valid and documented. Added `"both"` to all references.

5. **Unverified HTTP status code on timeout (504)**: The post claimed Dapr returns `504 Gateway Timeout` when a timeout expires. The official documentation only states that "the operation is terminated and an error is returned" without specifying a particular HTTP status code. Changed to the more accurate "terminates the operation and returns an error."

6. **Unverified HTTP status code on circuit breaker open (503)**: The post claimed calls return `503 Service Unavailable` when a circuit breaker is open. The official documentation does not confirm a specific HTTP status code for this case. Changed to a generic "fail immediately with an error" description.

## Review Notes
- The `trip` expression in the blog uses `consecutiveFailures >= 5` (opens on 5th failure). The documented default is `consecutiveFailures > 5` (opens on 6th failure). The `>=` syntax is valid CEL and will work, but readers should be aware this differs from the Dapr default. No change was made since the expression is valid and used as a custom example rather than claiming to be the default.
- The blog's description of the Resiliency YAML structure says it has "three sections" but only names two (`policies` and `targets`). This is technically correct since there are only two top-level sections under `spec`, but the wording "three sections" is slightly misleading. The three sub-sections exist under `policies` (retries, timeouts, circuitBreakers). No change was made as the intent is clear from context.
- The `scopes` field (controlling which Dapr App IDs can use the resiliency spec) is not mentioned in the blog. This is an omission rather than an error, and the post is already comprehensive enough without it.
