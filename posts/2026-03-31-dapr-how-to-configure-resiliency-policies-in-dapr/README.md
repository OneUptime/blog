# How to Configure Resiliency Policies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Retry, Circuit Breaker, Microservice

Description: Learn how to configure Dapr resiliency policies including retries, circuit breakers, and timeouts for service invocation, pub/sub, and bindings.

---

## What Are Dapr Resiliency Policies

Dapr resiliency policies define how Dapr handles failures when communicating with external systems - retrying transient errors, breaking circuits during outages, and enforcing timeouts on slow operations. These policies are configured declaratively in YAML and applied to service invocation, pub/sub, and bindings without changing application code.

## Prerequisites

- Dapr CLI installed (v1.7+)
- A running Dapr application
- Basic understanding of retry and circuit breaker patterns

## Define a Resiliency Resource

Create a `Resiliency` YAML file with named policies:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: my-resiliency
  namespace: default
spec:
  policies:
    retries:
      standard-retry:
        policy: constant
        duration: 5s
        maxRetries: 3

      exponential-retry:
        policy: exponential
        initialInterval: 1s
        maxInterval: 60s
        maxRetries: 10
        multiplier: 2.0

    timeouts:
      fast-timeout: 3s
      standard-timeout: 30s
      long-timeout: 120s

    circuitBreakers:
      standard-cb:
        maxRequests: 1
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 5
```

## Apply Policies to Targets

The `targets` section maps policies to specific services, components, or actors:

```yaml
spec:
  policies:
    retries:
      service-retry:
        policy: exponential
        initialInterval: 2s
        maxInterval: 30s
        maxRetries: 5

    timeouts:
      service-timeout: 10s

    circuitBreakers:
      service-cb:
        maxRequests: 1
        interval: 20s
        timeout: 30s
        trip: consecutiveFailures >= 3

  targets:
    apps:
      payment-service:
        retry: service-retry
        timeout: service-timeout
        circuitBreaker: service-cb

      inventory-service:
        retry: service-retry
        timeout: service-timeout

    components:
      kafka-binding:
        inbound:
          retry: service-retry
          timeout: service-timeout
        outbound:
          retry: service-retry

      redis-state:
        retry: service-retry
        timeout: service-timeout

    actors:
      OrderActor:
        retry: service-retry
        timeout: standard-timeout
```

## Configure Retry Policies

### Constant Retry

Retries at a fixed interval:

```yaml
retries:
  constant-retry:
    policy: constant
    duration: 5s        # wait 5s between retries
    maxRetries: 3       # up to 3 total retries
    matching:
      httpStatusCodes: "500,502,503,504"
      gRPCStatusCodes: "4,13,14"
```

### Exponential Backoff Retry

Retries with increasing delays:

```yaml
retries:
  exponential-retry:
    policy: exponential
    initialInterval: 500ms   # first retry after 500ms
    maxInterval: 60s         # cap at 60s
    maxRetries: 8
    multiplier: 2.0          # double each time
```

## Configure Circuit Breakers

A circuit breaker prevents repeated calls to a failing service:

```yaml
circuitBreakers:
  my-circuit-breaker:
    maxRequests: 1          # requests allowed while half-open
    interval: 30s           # evaluation window
    timeout: 30s            # how long circuit stays open
    trip: consecutiveFailures >= 5   # condition to open circuit
```

Circuit breaker states:

```text
CLOSED  - normal operation, requests pass through
OPEN    - service is failing, requests fail fast (no actual calls)
HALF-OPEN - one probe request allowed to test recovery
```

## Configure Timeouts

```yaml
timeouts:
  payment-timeout: 15s    # individual call timeout
  batch-timeout: 5m       # longer timeout for batch operations
```

Apply to specific services:

```yaml
targets:
  apps:
    slow-legacy-service:
      timeout: batch-timeout
      retry: exponential-retry
    fast-cache-service:
      timeout: payment-timeout
```

## Component-Specific Resiliency

Configure resiliency for bindings and state stores separately for inbound and outbound:

```yaml
targets:
  components:
    my-queue:
      inbound:    # messages coming in from the binding
        retry: exponential-retry
        timeout: standard-timeout
      outbound:   # messages going out through the binding
        retry: constant-retry
        timeout: fast-timeout
        circuitBreaker: standard-cb
```

## Apply the Resiliency Resource

```bash
kubectl apply -f resiliency.yaml
```

For self-hosted mode, place the file in your components directory and Dapr will load it automatically:

```bash
dapr run --app-id my-app \
  --resources-path ./components \
  node app.js
```

## Verify Resiliency Configuration is Loaded

Check that Dapr loaded your resiliency resource:

```bash
# In Kubernetes mode:
kubectl get resiliency -n default

# In self-hosted mode, check Dapr sidecar logs for:
# "resiliency configuration loaded" messages at startup
```

## Summary

Dapr resiliency policies provide declarative, code-free configuration of retries, circuit breakers, and timeouts for all Dapr building block interactions. By defining named policies in a `Resiliency` resource and mapping them to specific apps, components, and actors in the `targets` section, you make your entire microservice mesh resilient to transient failures, slow dependencies, and cascading outage scenarios without modifying application code.
