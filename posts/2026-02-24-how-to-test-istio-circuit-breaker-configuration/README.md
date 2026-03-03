# How to Test Istio Circuit Breaker Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Circuit Breaker, Resilience, Envoy, Kubernetes

Description: A hands-on guide to testing Istio circuit breaker configuration including connection pool limits, outlier detection, and verifying circuit breaker behavior under load.

---

Circuit breakers prevent a failing service from taking down everything that depends on it. In Istio, circuit breaking is configured through DestinationRules and works at the Envoy proxy level. But configuring a circuit breaker and knowing it actually trips when it should are two different things. You need to actively test it.

This guide shows you how to configure, test, and tune Istio circuit breakers with real traffic.

## How Istio Circuit Breaking Works

Istio implements two forms of circuit breaking through Envoy:

1. **Connection pool limits** - Caps the number of TCP connections and HTTP requests. When limits are hit, additional requests are rejected immediately with a 503.
2. **Outlier detection** - Monitors endpoints for errors and ejects unhealthy ones from the load balancing pool for a configurable duration.

Both are configured in DestinationRule resources.

## Setting Up for Testing

Create a test namespace and deploy httpbin as the target service:

```bash
kubectl create namespace circuit-test
kubectl label namespace circuit-test istio-injection=enabled
kubectl apply -n circuit-test -f samples/httpbin/httpbin.yaml
```

Deploy Fortio as the load generator:

```bash
kubectl apply -n circuit-test -f samples/httpbin/sample-client/fortio-deploy.yaml
```

Wait for everything to be ready:

```bash
kubectl wait --for=condition=ready pod --all -n circuit-test --timeout=120s
```

## Testing Connection Pool Limits

Apply a DestinationRule with tight connection limits:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin
  namespace: circuit-test
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1
      http:
        http1MaxPendingRequests: 1
        http2MaxRequests: 1
        maxRequestsPerConnection: 1
```

These values are intentionally very low to make it easy to trigger the circuit breaker. With maxConnections set to 1, any concurrent requests beyond the first one should be rejected.

First, verify that a single request works:

```bash
kubectl exec -n circuit-test deploy/fortio -c fortio -- \
  fortio load -c 1 -qps 0 -n 10 http://httpbin:8000/status/200
```

All 10 requests should succeed with 200 status.

Now send concurrent requests to trigger the circuit breaker:

```bash
kubectl exec -n circuit-test deploy/fortio -c fortio -- \
  fortio load -c 3 -qps 0 -n 30 http://httpbin:8000/status/200
```

With 3 concurrent connections and a limit of 1, you should see some 503 responses. The output will show something like:

```text
Code 200 : 20 (66.7 %)
Code 503 : 10 (33.3 %)
```

The exact ratio depends on timing, but you should definitely see 503s.

## Checking Envoy Stats

The Envoy proxy tracks circuit breaker events in its statistics. Check them:

```bash
kubectl exec -n circuit-test deploy/fortio -c istio-proxy -- \
  pilot-agent request GET stats | grep httpbin | grep pending
```

Look for these key metrics:

```text
cluster.outbound|8000||httpbin.circuit-test.svc.cluster.local.upstream_rq_pending_overflow: 10
cluster.outbound|8000||httpbin.circuit-test.svc.cluster.local.upstream_rq_pending_total: 30
```

The `upstream_rq_pending_overflow` counter shows how many requests were rejected by the circuit breaker. This is the definitive way to confirm the circuit breaker is working.

## Testing Outlier Detection

Outlier detection ejects endpoints that return errors. Configure it:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin
  namespace: circuit-test
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

This configuration ejects an endpoint after 3 consecutive 5xx errors, checks every 5 seconds, and ejects the endpoint for 30 seconds.

To test it, make httpbin return errors using the /status endpoint:

```bash
# Send requests that return 500
for i in $(seq 1 5); do
  kubectl exec -n circuit-test deploy/fortio -c fortio -- \
    fortio load -c 1 -qps 0 -n 1 http://httpbin:8000/status/500
done
```

After 3 consecutive 500 responses, the endpoint should be ejected. Check:

```bash
kubectl exec -n circuit-test deploy/fortio -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection"
```

Look for:

```text
cluster.outbound|8000||httpbin.circuit-test.svc.cluster.local.outlier_detection.ejections_active: 1
cluster.outbound|8000||httpbin.circuit-test.svc.cluster.local.outlier_detection.ejections_total: 1
```

## Testing with Multiple Replicas

Circuit breaking is more interesting with multiple backend replicas where some are healthy and some are failing. Scale httpbin to 3 replicas:

```bash
kubectl scale deployment httpbin -n circuit-test --replicas=3
```

Now use a VirtualService to inject faults on a percentage of requests, simulating one unhealthy replica:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: httpbin
  namespace: circuit-test
spec:
  hosts:
  - httpbin
  http:
  - fault:
      abort:
        percentage:
          value: 33
        httpStatus: 503
    route:
    - destination:
        host: httpbin
```

With outlier detection configured, the "failing" endpoint should get ejected, and subsequent requests should all go to healthy endpoints:

```bash
kubectl exec -n circuit-test deploy/fortio -c fortio -- \
  fortio load -c 5 -qps 10 -t 60s http://httpbin:8000/status/200
```

Watch the error rate decrease over time as outlier detection kicks in and ejects the problematic endpoint.

## Tuning Circuit Breaker Parameters

Getting the right values requires testing with realistic traffic patterns. Here is a more production-like configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin
  namespace: circuit-test
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 200
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Some guidelines for tuning:

- `maxConnections`: Set this based on the expected number of concurrent connections to the service. Too low and you will see unnecessary 503s during traffic spikes.
- `http1MaxPendingRequests`: Queue size for requests waiting for a connection. Keep this smaller than maxConnections to avoid long queues.
- `consecutive5xxErrors`: Lower values mean faster ejection but more false positives. 3-5 is a reasonable range.
- `maxEjectionPercent`: Never set this to 100% in production unless you have many replicas. If all endpoints get ejected, you have zero capacity.

## Verifying Recovery After Ejection

After an endpoint is ejected, it should automatically return to the pool after `baseEjectionTime`. Test this:

```bash
# Cause ejection
for i in $(seq 1 10); do
  kubectl exec -n circuit-test deploy/fortio -c fortio -- \
    fortio load -c 1 -qps 0 -n 1 http://httpbin:8000/status/500
done

# Check ejection count
kubectl exec -n circuit-test deploy/fortio -c istio-proxy -- \
  pilot-agent request GET stats | grep "ejections_active"

# Wait for recovery (baseEjectionTime = 30s)
sleep 35

# Check again - should be back to 0
kubectl exec -n circuit-test deploy/fortio -c istio-proxy -- \
  pilot-agent request GET stats | grep "ejections_active"
```

## Automating Circuit Breaker Tests

Put it all together in a test script:

```bash
#!/bin/bash
NAMESPACE="circuit-test"

echo "=== Circuit Breaker Test Suite ==="

echo "Test 1: Single connection succeeds"
RESULT=$(kubectl exec -n $NAMESPACE deploy/fortio -c fortio -- \
  fortio load -c 1 -qps 0 -n 10 http://httpbin:8000/status/200 2>&1)
SUCCESS=$(echo "$RESULT" | grep "Code 200" | awk '{print $4}')
echo "Success count: $SUCCESS (expected: 10)"

echo ""
echo "Test 2: Concurrent connections trigger overflow"
RESULT=$(kubectl exec -n $NAMESPACE deploy/fortio -c fortio -- \
  fortio load -c 5 -qps 0 -n 50 http://httpbin:8000/status/200 2>&1)
OVERFLOW=$(kubectl exec -n $NAMESPACE deploy/fortio -c istio-proxy -- \
  pilot-agent request GET stats | grep "pending_overflow" | awk -F: '{print $2}' | tr -d ' ')
echo "Overflow count: $OVERFLOW (expected: > 0)"

if [ "$OVERFLOW" -gt 0 ]; then
  echo "PASS: Circuit breaker triggered"
else
  echo "FAIL: Circuit breaker did not trigger"
fi
```

## Wrapping Up

Circuit breakers are a critical resilience pattern, but they only work if they are configured correctly for your traffic patterns. Test with Fortio to trigger connection pool limits, verify ejection behavior with outlier detection, and always check the Envoy stats to confirm the circuit breaker is actually doing its job. Start with aggressive limits in your test environment, observe the behavior, then tune for production.
