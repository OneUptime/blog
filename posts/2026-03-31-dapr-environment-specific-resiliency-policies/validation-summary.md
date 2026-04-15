# Validation Summary: How to Use Environment-Specific Dapr Resiliency Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (resiliency policies, circuit breakers, retries, timeouts)
- Kubernetes (kubectl, namespaces, port-forward)
- Kustomize (environment-specific deployment)
- Prometheus (metrics querying)
- gRPC (status codes for retry matching)

## Sources Consulted
- Dapr Resiliency schema reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr retry policies documentation: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr circuit breaker policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr resiliency targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr preview features list: https://docs.dapr.io/operations/support/support-preview-features/
- Dapr dashboard CLI reference: https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr metrics source (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- gRPC status codes: https://grpc.io/docs/guides/status-codes/
- Dapr v1.10 release notes (resiliency GA): https://www.infoq.com/news/2023/03/dapr-version-one-ten-released/

## Issues Found

1. **Outdated Resiliency feature flag (High severity)**: The post included a Dapr Configuration resource with `features: [{name: Resiliency, enabled: true}]` without noting that this feature flag is only required for Dapr v1.7-v1.9. Resiliency became stable in Dapr v1.10 (early 2023) and no longer requires opt-in. Added comments clarifying this is only needed for older Dapr versions.

2. **Non-existent "Resiliency tab" in Dapr Dashboard (High severity)**: The post claimed users could check circuit breaker state via `http://localhost:8080 -> Resiliency tab`. The Dapr Dashboard does not have a dedicated Resiliency tab. Updated the comment to generically reference viewing components and configurations.

3. **Incorrect Prometheus metric name (High severity)**: The post used `dapr_resiliency_count_total`, which is not a valid Dapr metric. The correct metric is `dapr_resiliency_count` (number of times a resiliency policy has been executed). Fixed to `dapr_resiliency_count`.

## Review Notes
- The `initialInterval` field used in exponential retry policies works correctly (confirmed in Dapr source code) but is not prominently documented in the official reference docs. Readers may not find it in the docs easily.
- The blog uses `>=` in circuit breaker `trip` expressions (e.g., `consecutiveFailures >= 5`) while official docs examples use `>`. Both are valid CEL syntax and functionally equivalent with threshold adjustment, so this is not an error.
- The section titled "Kustomize for Environment-Specific Resiliency" only shows plain `kubectl apply` commands, not actual Kustomize overlays (`kustomization.yaml` files). The title is slightly misleading but the summary paragraph does mention both Kustomize and Helm as deployment options.
