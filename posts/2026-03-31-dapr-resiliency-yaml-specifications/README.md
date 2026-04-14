# How to Write Dapr Resiliency YAML Specifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, YAML, Microservice, Configuration

Description: Learn how to write Dapr Resiliency YAML specifications to define retry, timeout, and circuit breaker policies for your distributed services.

---

## What Is a Dapr Resiliency Specification?

Dapr Resiliency specs let you declare how your services handle transient failures. Instead of baking retry logic into each service, you define a resiliency policy in a YAML file and Dapr applies it automatically at the sidecar level.

## Structure of a Resiliency YAML

A resiliency YAML uses the `dapr.io/v1alpha1` API version and the `Resiliency` kind. It has three main policy sections: `policies`, `targets`, and optional metadata.

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
  namespace: production
scopes:
  - order-service
spec:
  policies:
    retries:
      standard-retry:
        policy: constant
        duration: 5s
        maxRetries: 3
      exponential-retry:
        policy: exponential
        maxInterval: 30s
        maxRetries: 5
    timeouts:
      general: 30s
      slow-endpoint: 120s
    circuitBreakers:
      shared-cb:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      payment-service:
        retry: exponential-retry
        timeout: slow-endpoint
        circuitBreaker: shared-cb
    components:
      statestore:
        outbound:
          retry: standard-retry
          timeout: general
```

## Retry Policy Types

Dapr supports two retry policy types:

- `constant` - waits a fixed `duration` between each attempt
- `exponential` - increases the wait by a configurable multiplier (default 1.5) up to `maxInterval`

```yaml
retries:
  fast-retry:
    policy: constant
    duration: 1s
    maxRetries: 2
  gradual-retry:
    policy: exponential
    initialInterval: 500ms
    multiplier: 2
    maxInterval: 60s
    maxRetries: 10
```

## Timeout Policies

Timeouts are plain duration strings. Reference them by name in your targets:

```yaml
timeouts:
  default: 10s
  background: 300s
```

## Circuit Breaker Configuration

A circuit breaker trips after a threshold of consecutive failures and stays open for `timeout` seconds before allowing a single probe request:

```yaml
circuitBreakers:
  frontend-cb:
    maxRequests: 1
    interval: 15s
    timeout: 45s
    trip: consecutiveFailures >= 3
```

## Applying Resiliency to Targets

Targets can be apps or components. Each target maps to the named policies:

```yaml
targets:
  apps:
    inventory-service:
      retry: fast-retry
      timeout: default
      circuitBreaker: frontend-cb
  components:
    pubsub:
      outbound:
        retry: gradual-retry
```

## Scoping Resiliency to Specific Services

Use `scopes` to limit which app IDs the policy applies to. Omitting `scopes` applies the policy to all apps in the namespace:

```bash
# Apply the YAML to your Kubernetes cluster
kubectl apply -f resiliency.yaml -n production
```

## Summary

Dapr Resiliency YAML specs centralize fault-tolerance logic outside your code. By combining retry, timeout, and circuit breaker policies and scoping them to specific apps and components, you can build robust distributed systems with minimal code changes.
