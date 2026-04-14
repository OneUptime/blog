# How to Use Dapr Resiliency CRD for Declarative Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, CRD, Retry, Circuit Breaker

Description: Use Dapr's Resiliency CRD to declaratively define retry, timeout, and circuit breaker policies for service invocation, state, and pub/sub operations without code changes.

---

## What the Resiliency CRD Provides

Dapr's Resiliency CRD (`resiliencies.dapr.io`) allows you to define fault tolerance policies declaratively. These policies are applied by the Dapr sidecar, meaning your application code makes normal API calls and the sidecar handles retries, timeouts, and circuit breaking transparently.

## Resiliency CRD Structure

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
  namespace: default
spec:
  policies:
    retries:        # Named retry policies
      <name>:
        policy: <constant|exponential>
        duration: <initial-delay>
        maxInterval: <max-delay>
        maxRetries: <count|-1 for infinite>
    timeouts:       # Named timeout policies
      <name>: <duration>
    circuitBreakers: # Named circuit breaker policies
      <name>:
        maxRequests: <int>
        interval: <duration>
        timeout: <duration>
        trip: <CEL expression>
  targets:          # Apply policies to specific targets
    apps:
      <app-id>:
        timeout: <timeout-name>
        retry: <retry-name>
        circuitBreaker: <cb-name>
    components:
      <component-name>:
        inbound:
          timeout: <timeout-name>
          retry: <retry-name>
          circuitBreaker: <cb-name>
        outbound:
          timeout: <timeout-name>
          retry: <retry-name>
          circuitBreaker: <cb-name>
```

## Example: Production-Grade Resiliency Policy

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: production-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      fast: 2s
      standard: 10s
      long: 60s
    retries:
      noRetry:
        policy: constant
        duration: 0s
        maxRetries: 0
      standardRetry:
        policy: exponential
        duration: 500ms
        maxInterval: 15s
        maxRetries: 5
      infiniteRetry:
        policy: exponential
        duration: 1s
        maxInterval: 30s
        maxRetries: -1
    circuitBreakers:
      standardCB:
        maxRequests: 2
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      payments-api:
        timeout: standard
        retry: standardRetry
        circuitBreaker: standardCB
      inventory-api:
        timeout: fast
        retry: standardRetry
    components:
      statestore:
        outbound:
          timeout: standard
          retry: standardRetry
          circuitBreaker: standardCB
      pubsub:
        outbound:
          retry: infiniteRetry
```

## Circuit Breaker States

The circuit breaker has three states:
- **Closed** - normal operation, requests pass through
- **Open** - after `trip` condition is met, requests fail fast without hitting the target
- **Half-Open** - after `timeout`, allows `maxRequests` through to test recovery

```bash
# Monitor circuit breaker state changes
kubectl logs my-pod -c daprd | grep "circuit breaker"
# circuit breaker standardCB changed state from closed to open
```

## Testing Resiliency Policies

Validate retries work by temporarily making a downstream service unavailable:

```bash
# Scale down the target
kubectl scale deployment inventory-api --replicas=0

# Make a request that should be retried
curl http://localhost:3500/v1.0/invoke/inventory-api/method/check

# Watch sidecar retry attempts
kubectl logs my-pod -c daprd | grep "retry attempt"
```

## Summary

Dapr's Resiliency CRD externalizes fault tolerance configuration from application code. Define named retry, timeout, and circuit breaker policies and apply them to specific app IDs or component targets. The Dapr sidecar enforces these policies transparently on every API call, providing consistent resilience behavior across all services without modifying business logic.
