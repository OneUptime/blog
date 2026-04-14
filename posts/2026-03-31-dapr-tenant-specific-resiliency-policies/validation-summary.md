# Validation Summary: How to Implement Tenant-Specific Resiliency Policies with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency CRD (Custom Resource Definition)
- Kubernetes (namespaces, CRDs, kubectl)
- Retry policies (exponential backoff, constant)
- Circuit breaker pattern
- Dapr State Management API

## Sources Consulted
- Dapr Resiliency Overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies — https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Schema Reference — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr State Management API Reference — https://docs.dapr.io/reference/api/state_api/
- Dapr Sidecar (daprd) Documentation — https://docs.dapr.io/operations/troubleshooting/common_issues/

## Issues Found
No technical issues found.

## Review Notes
- The `apiVersion: dapr.io/v1alpha1` and `kind: Resiliency` are correct per Dapr v1.17 documentation.
- All policy fields (`timeouts`, `retries`, `circuitBreakers`) use correct field names and value formats. The `trip` expressions use `>=` rather than the default `>`, but both are valid CEL operators and represent a deliberate policy choice.
- The `spec.targets` structure correctly uses `apps` with flat `timeout`/`retry`/`circuitBreaker` keys and `components` with the `outbound` sub-key.
- Namespace-scoped Resiliency CRDs follow standard Kubernetes CRD namespace isolation, which is a valid approach for multi-tenant differentiation.
- The `kubectl get resiliency` command works because `Resiliency` is registered as a Kubernetes CRD (`resiliencies.dapr.io`).
- The Dapr sidecar container name `daprd` is correct.
- The State Management API endpoint (`POST /v1.0/state/statestore` with a JSON array body) is correct.
- The section "Applying Resiliency to All Outbound Calls" mentions `actors` and `components` targets in the heading text, but the code example only demonstrates `components`. This is not technically incorrect but could be expanded in a future revision to include an `actors` target example for completeness.
