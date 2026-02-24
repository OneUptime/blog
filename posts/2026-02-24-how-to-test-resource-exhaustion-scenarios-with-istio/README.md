# How to Test Resource Exhaustion Scenarios with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Resource Exhaustion, Chaos Engineering, Circuit Breaker, Kubernetes

Description: How to use Istio connection pool limits and fault injection to simulate and test resource exhaustion scenarios in your service mesh.

---

Resource exhaustion is when a service runs out of something it needs: connections, memory, CPU, file descriptors, thread pool capacity. When this happens, the service either starts rejecting requests, slowing down dramatically, or crashing entirely. The cascading effects can take down your entire system if callers do not handle the backpressure correctly.

Istio gives you tools to both simulate resource exhaustion and protect against it. Connection pool limits in DestinationRules let you cap resource usage, and when those limits are hit, the behavior looks exactly like resource exhaustion to the calling service.

## Setting Up

Deploy the test environment:

```bash
kubectl create namespace exhaust-test
kubectl label namespace exhaust-test istio-injection=enabled

kubectl apply -n exhaust-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/httpbin/httpbin.yaml

kubectl apply -n exhaust-test -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fortio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fortio
  template:
    metadata:
      labels:
        app: fortio
    spec:
      containers:
      - name: fortio
        image: fortio/fortio:latest
        ports:
        - containerPort: 8080
EOF

kubectl wait --for=condition=ready pod -l app=httpbin -n exhaust-test --timeout=60s
kubectl wait --for=condition=ready pod -l app=fortio -n exhaust-test --timeout=60s
```

## Simulating Connection Pool Exhaustion

Use an Istio DestinationRule to limit the connection pool to a very small number, then blast it with load:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-small-pool
  namespace: exhaust-test
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 5
      http:
        http1MaxPendingRequests: 5
        http2MaxRequests: 10
```

```bash
kubectl apply -n exhaust-test -f httpbin-small-pool.yaml
```

Now send more concurrent connections than the pool can handle:

```bash
FORTIO_POD=$(kubectl get pod -n exhaust-test -l app=fortio -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n exhaust-test $FORTIO_POD -- fortio load \
  -c 30 \
  -qps 0 \
  -t 30s \
  http://httpbin.exhaust-test.svc.cluster.local:8000/get
```

With 30 concurrent connections hitting a pool limited to 5, you should see a bunch of 503 responses. Check the output for the status code distribution:

```
Code 200 : 4523 (60.2 %)
Code 503 : 2987 (39.8 %)
```

The 503 responses are the Envoy proxy rejecting requests because the connection pool is full. This is exactly what happens during real resource exhaustion.

## Simulating Pending Request Overflow

The `http1MaxPendingRequests` setting controls how many requests can wait in the queue when all connections are busy:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-tiny-queue
  namespace: exhaust-test
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 2
      http:
        http1MaxPendingRequests: 1
        http2MaxRequests: 5
```

```bash
kubectl apply -n exhaust-test -f httpbin-tiny-queue.yaml
```

With only 2 connections and 1 pending request, even moderate load will overflow:

```bash
kubectl exec -n exhaust-test $FORTIO_POD -- fortio load \
  -c 10 \
  -qps 0 \
  -t 30s \
  http://httpbin.exhaust-test.svc.cluster.local:8000/delay/1
```

Using the `/delay/1` endpoint adds a 1-second delay to each response, which means connections are held open longer and the tiny pool fills up fast.

## Monitoring Circuit Breaker Trips

When connection pool limits are hit, Envoy tracks this as circuit breaker overflow. Check the stats:

```bash
FORTIO_POD_PROXY=$(kubectl get pod -n exhaust-test -l app=fortio -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n exhaust-test $FORTIO_POD_PROXY -c istio-proxy -- \
  pilot-agent request GET stats | grep "circuit_breaker"
```

You will see counters like:

```
cluster.outbound|8000||httpbin.exhaust-test.svc.cluster.local.circuit_breakers.default.cx_open: 0
cluster.outbound|8000||httpbin.exhaust-test.svc.cluster.local.circuit_breakers.default.cx_pool_open: 0
cluster.outbound|8000||httpbin.exhaust-test.svc.cluster.local.circuit_breakers.default.rq_pending_open: 0
cluster.outbound|8000||httpbin.exhaust-test.svc.cluster.local.circuit_breakers.high.cx_open: 0
cluster.outbound|8000||httpbin.exhaust-test.svc.cluster.local.upstream_rq_pending_overflow: 2987
```

The `upstream_rq_pending_overflow` counter shows how many requests were rejected due to the connection pool being full.

## Simulating Slow Resource Exhaustion

Real resource exhaustion often happens gradually. Combine Istio delay injection with connection pool limits:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: httpbin-slow
  namespace: exhaust-test
spec:
  hosts:
  - httpbin
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 2s
    route:
    - destination:
        host: httpbin
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-limited
  namespace: exhaust-test
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 20
      http:
        http1MaxPendingRequests: 20
        http2MaxRequests: 40
```

Now send a gradually increasing load:

```bash
for QPS in 5 10 20 50 100; do
  echo "=== Testing at $QPS QPS ==="
  kubectl exec -n exhaust-test $FORTIO_POD -- fortio load \
    -c 16 \
    -qps $QPS \
    -t 20s \
    http://httpbin.exhaust-test.svc.cluster.local:8000/get
  sleep 5
done
```

You should see that at low QPS everything works fine, but as QPS increases, the 2-second delay causes connections to pile up until the pool limit is hit and requests start getting rejected.

## Testing Outlier Detection (Instance-Level Exhaustion)

If one replica of a service is exhausted but others are fine, Istio's outlier detection should route traffic away from the bad instance:

Scale httpbin to multiple replicas:

```bash
kubectl scale deployment httpbin -n exhaust-test --replicas=3
```

Configure outlier detection:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-outlier
  namespace: exhaust-test
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

```bash
kubectl apply -n exhaust-test -f httpbin-outlier.yaml
```

If one instance starts returning 503s due to resource exhaustion, outlier detection will eject it from the load balancing pool after 3 consecutive errors. The remaining healthy instances continue serving traffic.

## Testing Memory Pressure Effects

While Istio cannot directly simulate memory pressure, you can observe how Envoy behaves under memory constraints. Set tight resource limits on the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: exhaust-test
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemoryLimit: "64Mi"
        sidecar.istio.io/proxyMemory: "32Mi"
    spec:
      containers:
      - name: httpbin
        image: docker.io/kennethreitz/httpbin
```

With only 64Mi for the proxy, high connection counts will push the sidecar toward its memory limit. Monitor proxy memory:

```bash
kubectl top pod -n exhaust-test --containers | grep istio-proxy
```

## Building Automated Exhaustion Tests

Create a script that systematically tests resource limits:

```bash
#!/bin/bash
NAMESPACE="exhaust-test"
FORTIO_POD=$(kubectl get pod -n $NAMESPACE -l app=fortio -o jsonpath='{.items[0].metadata.name}')
TARGET="http://httpbin.${NAMESPACE}.svc.cluster.local:8000/get"

test_connection_limit() {
  local max_conn=$1
  local concurrent=$2

  cat <<EOF | kubectl apply -n $NAMESPACE -f -
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-pool-test
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: $max_conn
      http:
        http1MaxPendingRequests: $max_conn
EOF

  sleep 3

  echo "Pool=$max_conn, Concurrent=$concurrent"
  kubectl exec -n $NAMESPACE $FORTIO_POD -- fortio load \
    -c $concurrent -qps 0 -t 15s $TARGET 2>&1 | grep "Code "
  echo "---"
}

test_connection_limit 5 10
test_connection_limit 5 50
test_connection_limit 20 50
test_connection_limit 50 50
test_connection_limit 50 200
```

This progressively tests different combinations of pool size and load to map out the failure boundary.

## Cleanup

```bash
kubectl delete namespace exhaust-test
```

Resource exhaustion testing is critical for production readiness. Istio's connection pool limits give you a clean, repeatable way to simulate what happens when services run out of capacity. Combine these tests with your monitoring and alerting to make sure you detect exhaustion conditions before they cascade into full outages.
