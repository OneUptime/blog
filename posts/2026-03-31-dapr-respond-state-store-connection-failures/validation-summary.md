# Validation Summary: How to Respond to Dapr State Store Connection Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar, state store API, component model, resiliency policies)
- Redis (as the example state store backend)
- Kubernetes (kubectl, pods, secrets, NetworkPolicy, deployments)
- Kubernetes NetworkPolicy API (networking.k8s.io/v1)

## Sources Consulted
- Dapr Component Schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis State Store setup: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Resiliency Schema reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency Policies overview: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Circuit Breaker policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Component Secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Component Updates (hot-reload): https://docs.dapr.io/operations/components/component-updates/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
1. **Resiliency YAML structure error**: The `circuitBreakers` policy definition was incorrectly nested under `targets.policies.circuitBreakers` instead of being placed under `spec.policies.circuitBreakers` as a sibling of `retries`. This would cause Dapr to not recognize the circuit breaker policy, and the `circuitBreaker: stateCircuitBreaker` reference in the target would fail to resolve. Fixed by moving `circuitBreakers` under `spec.policies` alongside `retries`, and keeping `targets` as a separate top-level key under `spec`.

## Review Notes
- The Dapr error code `ERR_STATE_STORE_NOT_CONFIGURED` is correct. A plural variant (`ERR_STATE_STORES_NOT_CONFIGURED`) also exists in some Dapr versions but the singular form used here is accurate for the described scenario.
- Dapr does support hot-reloading of components without pod restart (as of Dapr 1.9+). The post correctly notes this but also shows a `rollout restart` command as a confirmation step, which is a reasonable belt-and-suspenders approach.
- All kubectl commands, Component YAML fields (`redisHost`, `redisPassword`, `secretKeyRef`), and NetworkPolicy configuration are correct and current.
