# Validation Summary: How to Configure Resiliency Targets in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency API (v1alpha1)
- Dapr retry policies (constant, exponential)
- Dapr circuit breaker policies
- Dapr timeout policies
- YAML configuration

## Sources Consulted
- Dapr Resiliency Targets documentation: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies (Retries): https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency Policies (Override Defaults): https://docs.dapr.io/operations/resiliency/policies/retries/override-default-retries/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr kit retry source code (retry.Config struct): https://github.com/dapr/kit/blob/main/retry/retry.go
- Dapr runtime resiliency source code: https://github.com/dapr/dapr/blob/master/pkg/resiliency/resiliency.go

## Issues Found

### 1. Invalid use of `default` as a catch-all target name
**What was wrong:** The "Combining All Target Types" YAML example used `default` as a target name under both `apps` and `components`, implying it acts as a catch-all baseline for all targets of that type. The Summary section also referenced "Using `default` targets as a baseline." This pattern is not supported by Dapr. The Dapr runtime has no special handling of a literal `default` string as a target name. Instead, Dapr uses reserved default policy name templates (e.g., `DefaultAppRetryPolicy`, `DefaultComponentOutboundRetryPolicy`) defined in the policies section for fallback behavior.

**What was changed:**
- Replaced the `default` entries in the combined YAML example with concrete, named targets (`inventory-service` under apps, `my-state-store` under components) consistent with the rest of the post.
- Updated the Summary paragraph to remove the incorrect claim about `default` targets as a baseline, replacing it with accurate guidance about explicitly listing targets.

**Why:** Using `default` as a target name would only match an app or component literally named "default" — it would not function as a wildcard. This would mislead readers into thinking they have a catch-all safety net when they do not.

## Review Notes
- The `initialInterval` field used in the exponential retry example (line 109) is technically valid — the Dapr `kit/retry` Go struct includes `InitialInterval` with mapstructure tag `"initialInterval"`. However, this field is not mentioned in the official Dapr documentation for retry policies, which only lists `maxInterval` and `maxRetries` for exponential retries. It works but is underdocumented.
- Actor targets also support `circuitBreakerScope` (`id`/`type`/`both`) and `circuitBreakerCacheSize` fields, which the post does not mention. This is acceptable for the post's scope but could be a useful addition in the future.
- The `matching` fields (`httpStatusCodes`, `gRPCStatusCodes`) for retry policies are also not mentioned, but are outside the scope of this post about targets.
