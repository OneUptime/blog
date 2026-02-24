# How to Test Circuit Breaking with Load Testing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Circuit Breaking, Load Testing, Kubernetes

Description: How to use fortio and other tools to load test circuit breaking configurations in Istio and verify they protect your services under stress.

---

You have configured circuit breaking in your Istio DestinationRule. But does it actually work? The only way to know for sure is to test it under load. Istio ships with fortio, a fast and flexible load testing tool that is perfect for verifying circuit breaker behavior. This guide walks through practical load testing scenarios.

## Setting Up the Test Environment

First, deploy a test service. The httpbin sample from Istio works great for this:

```bash
# Deploy httpbin as the target service
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/httpbin.yaml

# Deploy fortio as the load generator
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/sample-client/fortio/fortio-deploy.yaml

# Verify both are running with sidecars
kubectl get pods -l app=httpbin
kubectl get pods -l app=fortio
```

Now apply a circuit breaking DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: httpbin
  namespace: default
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1
      http:
        http1MaxPendingRequests: 1
        maxRequestsPerConnection: 1
    outlierDetection:
      consecutive5xxErrors: 1
      interval: 1s
      baseEjectionTime: 3m
      maxEjectionPercent: 100
```

These are intentionally tight limits for testing - 1 connection, 1 pending request. In production you would use much higher values.

## Test 1: Verify Connection Limits

Send traffic with just one connection to establish a baseline:

```bash
# Single connection - should work fine
kubectl exec deploy/fortio -- fortio load \
  -c 1 \
  -qps 0 \
  -n 20 \
  -loglevel Warning \
  http://httpbin:8000/get
```

You should see 100% success (all 200 responses). Now increase the concurrency:

```bash
# 3 concurrent connections - should trigger circuit breaking
kubectl exec deploy/fortio -- fortio load \
  -c 3 \
  -qps 0 \
  -n 30 \
  -loglevel Warning \
  http://httpbin:8000/get
```

With `maxConnections: 1` and `http1MaxPendingRequests: 1`, only 2 requests can be in flight at once (1 active + 1 pending). The third concurrent request should get a 503.

Look at the output for something like:

```
Code 200 : 20 (66.7 %)
Code 503 : 10 (33.3 %)
```

If you see 503s, the circuit breaker is working. The exact percentage depends on timing, but you should see a significant number of 503s.

## Test 2: Verify the 503 Is From Envoy

Check that the 503s are actually from the circuit breaker and not from the backend:

```bash
# Check upstream overflow stats
kubectl exec deploy/fortio -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "httpbin" | grep "overflow"
```

You should see `upstream_rq_pending_overflow` incrementing. This confirms the circuit breaker is the source of the 503s.

## Test 3: Test Outlier Detection

For outlier detection testing, you need a service that returns errors. httpbin's `/status/500` endpoint works perfectly:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: httpbin
  namespace: default
spec:
  host: httpbin
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

```bash
# Send requests that will return 500 errors
kubectl exec deploy/fortio -- fortio load \
  -c 1 \
  -qps 1 \
  -t 30s \
  -loglevel Warning \
  http://httpbin:8000/status/500
```

After 3 consecutive errors, the host should be ejected:

```bash
# Check ejection status
kubectl exec deploy/fortio -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "ejections"

# Check host health flags
kubectl exec deploy/fortio -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep httpbin
```

Look for `health_flags::/failed_outlier_check` in the clusters output, which indicates the host is ejected.

## Test 4: Progressive Load Test

A more realistic test gradually increases load to find the breaking point:

```bash
# Step 1: Low load
echo "=== 5 concurrent connections ==="
kubectl exec deploy/fortio -- fortio load \
  -c 5 -qps 0 -n 100 -loglevel Warning \
  http://httpbin:8000/get 2>&1 | grep "Code"

# Step 2: Medium load
echo "=== 20 concurrent connections ==="
kubectl exec deploy/fortio -- fortio load \
  -c 20 -qps 0 -n 200 -loglevel Warning \
  http://httpbin:8000/get 2>&1 | grep "Code"

# Step 3: High load
echo "=== 50 concurrent connections ==="
kubectl exec deploy/fortio -- fortio load \
  -c 50 -qps 0 -n 500 -loglevel Warning \
  http://httpbin:8000/get 2>&1 | grep "Code"
```

Apply a more realistic circuit breaking configuration first:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: httpbin
  namespace: default
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10
      http:
        http1MaxPendingRequests: 10
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

At 5 connections, you should see all 200s. At 20, some 503s should appear. At 50, the 503 rate should be significant.

## Test 5: Sustained Load Under Circuit Breaking

Test what happens when circuit breaking is active for an extended period:

```bash
# Run for 2 minutes with moderate overload
kubectl exec deploy/fortio -- fortio load \
  -c 30 \
  -qps 100 \
  -t 120s \
  -loglevel Warning \
  http://httpbin:8000/get
```

During the test, monitor the circuit breaker in another terminal:

```bash
# Watch stats in real-time
watch -n 2 "kubectl exec deploy/fortio -c istio-proxy -- \
  curl -s localhost:15000/stats | \
  grep -E 'overflow|ejections_active|cx_active|rq_active'"
```

## Analyzing Test Results

After running your tests, gather a complete picture:

```bash
# Full stats dump for analysis
kubectl exec deploy/fortio -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "httpbin" > /tmp/circuit-breaker-stats.txt

# Key metrics to check
echo "=== Connection Stats ==="
grep "cx_active\|cx_total\|cx_overflow" /tmp/circuit-breaker-stats.txt

echo "=== Request Stats ==="
grep "rq_active\|rq_total\|pending_overflow" /tmp/circuit-breaker-stats.txt

echo "=== Outlier Detection ==="
grep "ejections" /tmp/circuit-breaker-stats.txt
```

## What Good Results Look Like

A well-configured circuit breaker under test should show:

1. **Under normal load:** 0% error rate, no overflows, no ejections
2. **Under moderate overload:** Small percentage of 503s, overflow counts incrementing slowly
3. **Under heavy overload:** Higher 503 rate, but the service itself stays healthy (response times for successful requests remain stable)
4. **With failing instances:** Ejected hosts visible, traffic shifted to healthy hosts, overall error rate lower than without circuit breaking

## What Bad Results Look Like

Signs your circuit breaking needs tuning:

- **503s during normal load:** Limits are too tight. Increase `maxConnections` and `http1MaxPendingRequests`.
- **No 503s even under heavy load:** Limits are too generous. The circuit breaker will not protect the service when it actually matters.
- **Successful request latency increases under load:** The pending queue is too deep. Reduce `http1MaxPendingRequests` so requests fail fast instead of waiting.

## Cleaning Up

After testing, clean up the tight circuit breaking rules:

```bash
# Remove the test DestinationRule
kubectl delete destinationrule httpbin

# Or apply production-appropriate settings
kubectl apply -f production-destination-rule.yaml

# Clean up test deployments if done
kubectl delete -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/httpbin.yaml
kubectl delete -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/sample-client/fortio/fortio-deploy.yaml
```

Load testing circuit breakers is not optional. It is the only way to know your configuration will actually work when you need it. Run these tests in a staging environment before deploying new circuit breaker settings to production, and re-run them whenever you change service capacity or traffic patterns.
