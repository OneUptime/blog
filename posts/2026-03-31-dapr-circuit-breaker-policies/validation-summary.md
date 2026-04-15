# Validation Summary: How to Configure Circuit Breaker Policies in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency resources
- Circuit breaker pattern (Closed / Open / Half-Open states)
- Kubernetes (for log observation examples)
- Prometheus metrics

## Sources Consulted
- Dapr Resiliency Policies - Circuit Breakers: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/
- Dapr source code (`resiliency_monitoring.go`) for metric label verification

## Issues Found

1. **Misleading trip expression comment (Trip Expressions section):** The second example had the comment `# Open after 50% error rate (custom expressions may vary by version)` but used the expression `consecutiveFailures >= 3`, which counts consecutive failures, not error rate. Changed the comment to `# Open after 3 consecutive failures (more aggressive)` and updated the expression to `consecutiveFailures > 3` to align with documented Dapr conventions.

2. **Incorrect Prometheus metric label name (Metrics section):** The post referenced `policyType=circuitbreaker` as the label to filter on, but the actual Dapr metric label key is `policy`, not `policyType`. Corrected to `policy=circuitbreaker`.

## Review Notes
- The blog uses `consecutiveFailures >= 5` in the main configuration example, while the Dapr docs default is `consecutiveFailures > 5`. Both are valid CEL expressions; the blog's usage is intentional and its accompanying description ("Open after 5 consecutive failures") is consistent with the `>=` operator. No change was made here since the example is self-consistent.
- The `trip` field supports Common Expression Language (CEL) with variables `consecutiveFailures`, `requests`, and `totalFailures`. The blog only demonstrates `consecutiveFailures`, which is the most common usage.
- Dapr also supports circuit breakers on actor targets (`spec.targets.actors`), which the blog does not cover. This is acceptable since the post focuses on service and component targets.
- The default metrics port of 9090 is correct per Dapr documentation.
