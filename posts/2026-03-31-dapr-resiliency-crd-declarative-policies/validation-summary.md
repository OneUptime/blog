# Validation Summary: How to Use Dapr Resiliency CRD for Declarative Policies

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency CRD (`resiliencies.dapr.io`)
- Kubernetes Custom Resource Definitions (CRDs)
- Circuit Breaker pattern
- Retry policies (constant and exponential backoff)
- Common Expression Language (CEL)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Targets: https://docs.dapr.io/operations/resiliency/targets/
- CEL specification: https://github.com/google/cel-spec

## Issues Found
1. **Missing `circuitBreaker` in component inbound template** (line 49 area): The CRD structure template showed `inbound` for component targets with only `timeout` and `retry`, but omitted `circuitBreaker`. Per the official Dapr documentation, `inbound` also supports `circuitBreaker`. Added the missing field.

## Review Notes
- The `apiVersion` (`dapr.io/v1alpha1`) and `kind` (`Resiliency`) are correct per current Dapr documentation.
- All retry policy fields (`policy`, `duration`, `maxInterval`, `maxRetries`) and their values are accurate. `maxRetries: -1` correctly denotes unlimited retries.
- Circuit breaker fields (`maxRequests`, `interval`, `timeout`, `trip`) are correct. The `trip` field correctly uses CEL expressions.
- Circuit breaker states (Closed, Open, Half-Open) are accurately described.
- The blog omits the `actors` target type and the `matching` sub-field for retries (`httpStatusCodes`, `gRPCStatusCodes`), but these omissions are reasonable given the stated scope of the post.
- The production example YAML is well-structured and demonstrates realistic policy configurations.
