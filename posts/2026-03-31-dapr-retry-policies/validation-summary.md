# Validation Summary: How to Configure Retry Policies in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency resources (retry policies)
- Kubernetes (for log observation example)

## Sources Consulted
- Dapr Resiliency Policies documentation: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Retry Policies documentation: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Override Default Retries: https://docs.dapr.io/operations/resiliency/policies/retries/override-default-retries/
- Dapr source code (`dapr/kit/retry/retry.go`) for the retry Config struct and mapstructure tags

## Issues Found

### 1. Incorrect claim about which errors are retried (lines 77-79)
- **What was wrong:** The post stated that Dapr only retries specific HTTP codes (429, 502, 503, 504) and gRPC codes (UNAVAILABLE, RESOURCE_EXHAUSTED) by default. This is incorrect — Dapr retries **all** failed operations by default unless a `matching` filter is configured.
- **What was changed:** Rewrote the "What Gets Retried" section to accurately state that all errors are retried by default, and added an example of the `matching` field for filtering retries to specific HTTP/gRPC status codes.
- **Why:** The original text could mislead readers into thinking Dapr has a built-in allowlist of retryable codes for user-defined retry policies, when in fact retries are applied to all failures unless explicitly filtered.

## Review Notes
- The exponential retry fields `initialInterval`, `multiplier`, and `randomizationFactor` are not listed in the official Dapr documentation but are valid and functional — they exist in the source code (`dapr/kit/retry`) with `mapstructure` tags and are parsed from YAML. The blog is technically correct in using them, but readers should be aware these are undocumented configuration options.
- The `maxElapsedTime` field is another valid but undocumented exponential retry option (default: 15 minutes) that the post does not mention. This is acceptable for the post's scope.
- The Resiliency resource API version (`dapr.io/v1alpha1`) and kind (`Resiliency`) are correct.
- The targets structure for apps (direct `retry:` reference) and components (`outbound:` nesting) is correct per the official docs.
- The kubectl log observation command is syntactically correct, though the exact log message format may vary across Dapr versions.
