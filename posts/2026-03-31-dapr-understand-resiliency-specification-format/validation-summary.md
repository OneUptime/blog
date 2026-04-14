# Validation Summary: How to Understand Dapr Resiliency Specification Format

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency specification (v1alpha1)
- YAML configuration
- Kubernetes (kubectl)
- Circuit breaker pattern
- Retry policies (constant and exponential backoff)
- Common Expression Language (CEL)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency Targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr kit retry source code: https://github.com/dapr/kit (retry/retry.go - Config struct and field definitions)
- Dapr runtime resiliency types: https://github.com/dapr/dapr (pkg/apis/resiliency/v1alpha1/types.go - ComponentPolicyNames struct)

## Issues Found

### 1. Invalid exponential retry fields in top-level example (HIGH)
**What was wrong:** The top-level YAML example used `duration: 5s` and `maxDuration: 15s` for an exponential retry policy. The `duration` field only applies to the `constant` policy per official docs, and `maxDuration` does not exist as a field at all. The correct field for the exponential backoff ceiling is `maxInterval`.
**What was changed:** Removed `duration: 5s` and replaced `maxDuration: 15s` with `maxInterval: 15s`.

### 2. Component targets used flat structure instead of inbound/outbound (HIGH)
**What was wrong:** The `statestore` component target was shown with a flat structure (`timeout: general`, `retry: standard` directly under the component name). Per the Dapr `ComponentPolicyNames` Go struct, component targets only accept `inbound` and `outbound` as sub-keys. A flat structure would be silently ignored.
**What was changed:** Added `outbound:` sub-key nesting to both statestore component target examples (in the top-level format section and the targets section).

### 3. Incorrect circuit breaker trip variable name (MEDIUM)
**What was wrong:** The post listed `failureRatio` as an available trip expression variable. This variable does not exist in Dapr's circuit breaker implementation. The correct variables are `consecutiveFailures`, `totalFailures`, `requests`, and `consecutiveSuccesses`.
**What was changed:** Replaced `failureRatio` with the correct variables: `totalFailures` and `consecutiveSuccesses`.

## Review Notes
- The exponential retry example uses `initialInterval`, `multiplier`, and `randomizationFactor` fields. These are not in the official Dapr documentation but ARE supported in the source code (`dapr/kit/retry` package with corresponding `mapstructure` tags). They work correctly but could change without notice since they are undocumented. This was left as-is since the fields do function correctly.
- The post does not mention the `scopes` top-level field (which limits which app IDs the resiliency resource applies to). This is an omission rather than an error.
- The post does not mention `actors` as a target type. This is an omission rather than an error.
- The post does not mention the `matching` sub-field for retry status code filtering (new in Dapr v1.15). This is an omission rather than an error.
- The self-hosted placement path `~/.dapr/components/` is correct for the default Dapr configuration directory.
