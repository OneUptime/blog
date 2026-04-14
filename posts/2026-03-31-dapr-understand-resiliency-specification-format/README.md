# How to Understand Dapr Resiliency Specification Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Retry, Circuit Breaker, Timeout

Description: Learn the structure of Dapr resiliency YAML files including retry policies, timeouts, circuit breakers, and how to target them at specific services or components.

---

Dapr resiliency policies let you define retry, timeout, and circuit breaker behavior in configuration files rather than in application code. The Dapr sidecar enforces these policies transparently on every outbound call.

## Top-Level Format

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
spec:
  policies:
    timeouts:
      general: 5s
    retries:
      standard:
        policy: exponential
        maxInterval: 15s
        maxRetries: 3
    circuitBreakers:
      shared:
        maxRequests: 1
        interval: 5s
        timeout: 10s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      order-service:
        timeout: general
        retry: standard
        circuitBreaker: shared
    components:
      statestore:
        outbound:
          timeout: general
          retry: standard
```

## Retry Policies

Dapr supports two retry policy types:

**Constant** - retries at a fixed interval:

```yaml
retries:
  constant-retry:
    policy: constant
    duration: 2s
    maxRetries: 5
```

**Exponential** - retries with exponential backoff:

```yaml
retries:
  exponential-retry:
    policy: exponential
    initialInterval: 500ms
    multiplier: 1.5
    randomizationFactor: 0.5
    maxInterval: 60s
    maxRetries: 10
```

## Timeout Policies

Timeouts are simple duration strings:

```yaml
timeouts:
  fast: 1s
  normal: 5s
  slow: 30s
```

Valid time units are `ms`, `s`, `m`, `h`.

## Circuit Breaker Policies

Circuit breakers stop cascading failures by temporarily blocking calls to a failing target:

```yaml
circuitBreakers:
  mybreaker:
    maxRequests: 1        # Requests allowed in half-open state
    interval: 10s         # Stats window duration
    timeout: 30s          # Time to stay open before half-open
    trip: consecutiveFailures >= 3
```

The `trip` expression uses CEL. Available variables are `consecutiveFailures`, `totalFailures`, `requests`, and `consecutiveSuccesses`.

## Targets

Policies are applied to specific targets:

```yaml
targets:
  apps:
    checkout-service:
      timeout: normal
      retry: exponential-retry
      circuitBreaker: mybreaker
  components:
    pubsub:
      outbound:
        timeout: fast
        retry: constant-retry
    statestore:
      outbound:
        timeout: normal
        retry: standard
```

For components, you can apply separate policies to `inbound` and `outbound` traffic.

## Applying Resiliency Policies

```bash
# Kubernetes
kubectl apply -f resiliency.yaml -n production

# Self-hosted - place in components directory
cp resiliency.yaml ~/.dapr/components/
```

## Summary

Dapr resiliency YAML uses the `Resiliency` kind and defines named `policies` for timeouts, retries, and circuit breakers. The `targets` section wires those policies to specific app IDs or component names, enabling fine-grained fault tolerance configuration without touching application code.
