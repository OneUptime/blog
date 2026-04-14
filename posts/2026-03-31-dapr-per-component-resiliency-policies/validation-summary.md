# Validation Summary: How to Configure Per-Component Resiliency Policies in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — Resiliency framework
- Kubernetes (namespace-scoped resource deployment, kubectl, pod logs)
- YAML configuration for Dapr Resiliency resources
- Redis (state store example)
- RabbitMQ (pub/sub example)
- MySQL (output binding example)
- curl (HTTP API testing)

## Sources Consulted
- Dapr Resiliency overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency resource spec / schema — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency policies (retries, timeouts, circuit breakers) — https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency targets (apps, components, actors) — https://docs.dapr.io/operations/resiliency/targets/
- Dapr Circuit breaker policy reference — https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Retry policy reference — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr State management API reference — https://docs.dapr.io/reference/api/state_api/

## Issues Found
No technical issues found.

## Review Notes
- The `apiVersion: dapr.io/v1alpha1` and `kind: Resiliency` are correct for the current Dapr resiliency spec.
- The `spec.policies` structure with `timeouts`, `retries`, and `circuitBreakers` subsections is accurate.
- Component targets correctly use the `outbound` key with `timeout`, `retry`, and `circuitBreaker` fields. Components also support an `inbound` key (relevant for pub/sub subscribers), which the post doesn't mention but isn't required for this topic.
- Retry policy formats are correct: `policy: constant` with `duration` and `maxRetries`; `policy: exponential` with `maxRetries` and `maxInterval`.
- Circuit breaker fields (`maxRequests`, `timeout`, `trip` with `consecutiveFailures >= N`) are valid. The trip expression supports standard comparison operators including `>=`.
- The state API endpoint `POST http://localhost:3500/v1.0/state/{storeName}` with the JSON array body format is correct.
- The `targets.apps` section alongside `targets.components` is valid. A third target type, `targets.actors`, also exists but is outside the scope of this post.
- Resiliency resources are indeed namespace-scoped in Kubernetes, and deploying separate resources per namespace is correct practice.
- The expected log output in the "Verifying Policy Assignment" section is illustrative rather than exact — actual Dapr log messages may vary slightly by version, but the approach of grepping daprd logs for resiliency information is valid.
