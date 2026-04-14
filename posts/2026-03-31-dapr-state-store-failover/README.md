# How to Handle State Store Failover in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Failover, State Store, High Availability, Resilience

Description: Learn strategies for handling state store failover in Dapr, including retry configuration, circuit breaking, and multi-store patterns to keep microservices resilient.

---

## Overview

When a Dapr state store becomes unavailable, your microservices must handle the failure gracefully. Dapr provides built-in retry policies and resiliency features, but understanding how to configure them correctly - and how to design your application for failover - is key to building highly available systems.

## Configuring Dapr Resiliency Policies

Dapr's resiliency API lets you define retry, timeout, and circuit breaker policies for state store operations:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: state-resiliency
  namespace: default
spec:
  policies:
    retries:
      stateRetry:
        policy: exponential
        maxInterval: 5s
        maxRetries: 5

    timeouts:
      stateTimeout: 10s

    circuitBreakers:
      stateCircuitBreaker:
        maxRequests: 1
        timeout: 30s
        trip: consecutiveFailures >= 5

  targets:
    components:
      redis-statestore:
        outbound:
          retry: stateRetry
          timeout: stateTimeout
          circuitBreaker: stateCircuitBreaker
```

Apply the resiliency policy:

```bash
kubectl apply -f state-resiliency.yaml
```

## Application-Level Failover Pattern

Implement a fallback in your application code when the primary state store is unavailable:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

async function getStateWithFallback(key) {
  try {
    const value = await client.state.get("redis-statestore", key);
    if (value) return value;
  } catch (err) {
    console.warn(`Primary state store failed for key ${key}:`, err.message);
  }

  // Fallback to secondary state store
  try {
    const value = await client.state.get("postgres-statestore", key);
    console.info(`Served ${key} from fallback state store`);
    return value;
  } catch (err) {
    console.error(`Both state stores unavailable for key ${key}:`, err.message);
    throw new Error("State store unavailable");
  }
}
```

## Redis Sentinel for Automatic Failover

Use Redis Sentinel to provide automatic primary failover:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-sentinel-0:26379,redis-sentinel-1:26379,redis-sentinel-2:26379"
  - name: sentinelMasterName
    value: "mymaster"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: failover
    value: "true"
```

## Monitoring State Store Health

Track state store availability using Dapr's health endpoint:

```bash
# Check Dapr sidecar health (includes component status)
curl http://localhost:3500/v1.0/healthz/outbound
```

Set up alerts when state store operations fail:

```yaml
# Prometheus alert rule
groups:
- name: dapr-state-store
  rules:
  - alert: DaprStateStoreHighErrorRate
    expr: rate(dapr_component_state_count{operation="get", success="false"}[5m]) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Dapr state store error rate above 5%"
```

## Testing Failover

Simulate a state store failure in a test environment:

```bash
# Stop Redis to trigger failover
kubectl scale deployment redis --replicas=0

# Verify application continues serving requests (from fallback)
curl http://myservice/api/state/test-key

# Restore Redis
kubectl scale deployment redis --replicas=1
```

## Summary

Handling Dapr state store failover requires a combination of Dapr's resiliency policies for automatic retries and circuit breaking, application-level fallback logic for graceful degradation, and a highly available state store backend like Redis Sentinel. Testing failover scenarios proactively ensures your microservices remain resilient under real-world conditions.
