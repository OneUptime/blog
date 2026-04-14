# Validation Summary: How to Set Up Timeout Policies in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency resources (timeout and retry policies)
- Kubernetes (for sidecar log inspection)
- Python (for mock service example)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Service Invocation API: https://docs.dapr.io/reference/api/service_invocation_api/

## Issues Found
1. **Misleading retry timing claim (line 71)**: The text stated "Dapr immediately attempts the next retry" but the accompanying YAML example shows a `duration: 500ms` backoff between retries. Changed "immediately attempts" to "attempts the next retry after the specified backoff duration" to accurately reflect the retry behavior shown in the example.

## Review Notes
- All YAML structures (`apiVersion`, `kind`, `spec.policies.timeouts`, `spec.targets.apps`, `spec.targets.components`) match the official Dapr Resiliency schema.
- The `outbound`/`inbound` component target fields and their explanations are correct per the docs.
- The service invocation URL format (`http://localhost:3500/v1.0/invoke/<appID>/method/<method>`) is correct.
- Go duration syntax claim is correct — Dapr uses Go's `time.ParseDuration` format.
- The `maxRetries: 3` correctly means up to 3 additional attempts (4 total), which the blog accurately describes as "up to 3 more times."
- Partial YAML snippets (for targets and the timeout+retry example) omit the full resource wrapper (`apiVersion`, `kind`, `metadata`, `spec`) for brevity. This is standard blog practice and the first example provides the complete structure.
- The post does not mention that gRPC service invocation does not currently support resiliency policies — a minor omission but outside the post's scope.
