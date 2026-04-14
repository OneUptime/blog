# How to Simulate State Store Failures for Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Store, Failure, Testing, Resilience

Description: Simulate Redis and other state store failures for Dapr applications using Toxiproxy, pod deletion, and Chaos Mesh to validate state management resiliency policies.

---

## Why Test State Store Failures?

Dapr's state management building block abstracts your state store behind a consistent API, but your application's behavior during a state store outage depends entirely on your resiliency configuration. Testing state store failures ensures your app handles unavailability gracefully rather than crashing.

## Failure Scenarios to Simulate

Common state store failure modes:
- Complete unavailability (Redis pod down)
- High latency (slow disk, network congestion)
- Connection limit exhaustion
- Intermittent timeouts

## Scenario 1: Kill the Redis Pod

The simplest test - delete the Redis pod and observe Dapr behavior:

```bash
# Find the Redis pod
kubectl get pods | grep redis

# Kill it
kubectl delete pod redis-master-0

# Watch Dapr sidecar logs for the app using state store
kubectl logs -l app=orderservice -c daprd -f | grep -E "error|retry|state"
```

The pod will restart via the StatefulSet, typically in 30-60 seconds. Your Dapr app should retry during this window.

## Scenario 2: Toxiproxy Latency on State Store

Route Dapr's Redis connection through Toxiproxy:

```bash
# Start Toxiproxy
docker run -d --name toxiproxy \
  -p 8474:8474 -p 6380:6380 \
  --network host \
  shopify/toxiproxy

# Create Redis proxy
toxiproxy-cli create redis-proxy \
  --listen 0.0.0.0:6380 \
  --upstream 127.0.0.1:6379

# Inject 2 second latency
toxiproxy-cli toxic add redis-proxy \
  -t latency \
  -a latency=2000 \
  -a jitter=500 \
  -n redis-latency
```

Update Dapr component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "127.0.0.1:6380"
    - name: maxRetries
      value: "3"
    - name: maxRetryBackoff
      value: "2s"
```

## Scenario 3: Chaos Mesh Pod Failure

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Schedule
metadata:
  name: redis-pod-failure-schedule
  namespace: default
spec:
  schedule: "@every 10m"
  type: PodChaos
  podChaos:
    action: pod-failure
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: redis
    duration: "60s"
```

```bash
kubectl apply -f redis-pod-failure-schedule.yaml
```

## Configure Dapr Resiliency for State Store

Define a resiliency policy to handle state store unavailability:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: statestore-resiliency
spec:
  policies:
    timeouts:
      stateTimeout: 3s
    retries:
      stateRetry:
        policy: exponential
        maxRetries: 5
        maxInterval: 10s
        duration: 500ms
    circuitBreakers:
      stateCircuitBreaker:
        maxRequests: 1
        interval: 15s
        timeout: 30s
        trip: consecutiveFailures > 5
  targets:
    components:
      statestore:
        outbound:
          timeout: stateTimeout
          retry: stateRetry
          circuitBreaker: stateCircuitBreaker
```

## Observe Application Behavior

```bash
# Check if app handles state store downtime gracefully
curl http://localhost:3000/api/orders/123

# Expected: graceful degradation or cached response, not 500 error
# Check Dapr metrics
curl http://localhost:9090/metrics | grep dapr_state
```

## Summary

Simulating Dapr state store failures using pod deletion, Toxiproxy, or Chaos Mesh reveals how your application behaves during infrastructure outages. Combining these failure tests with Dapr resiliency policies (timeouts, retries, circuit breakers) ensures your state-dependent operations degrade gracefully rather than cascading into full application failure.
