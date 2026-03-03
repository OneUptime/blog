# How to Validate Circuit Breaker Behavior with Chaos Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Circuit Breaker, Chaos Testing, Resilience, Kubernetes

Description: A step-by-step guide to verifying that Istio circuit breakers work correctly by running targeted chaos experiments against your services.

---

You configured circuit breakers in your Istio DestinationRules. Great. But have you actually verified they work? Setting a configuration value is not the same as testing it. Circuit breakers are supposed to protect your services from cascading failures, but if the thresholds are wrong or the behavior is not what you expected, you will not find out until an actual incident.

This guide shows you how to deliberately trigger circuit breakers using chaos tests and verify they behave correctly.

## How Istio Circuit Breakers Work

Istio implements circuit breakers through two mechanisms in the DestinationRule:

1. **Connection pool limits**: Hard caps on connections and pending requests. When exceeded, new requests are immediately rejected with 503.

2. **Outlier detection**: Tracks error rates per upstream instance and ejects unhealthy instances from the load balancing pool.

Both work together, but they serve different purposes. Connection pool limits protect against overload. Outlier detection protects against bad instances.

## Setting Up the Test

Deploy the test application:

```bash
kubectl create namespace cb-test
kubectl label namespace cb-test istio-injection=enabled

kubectl apply -n cb-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/httpbin/httpbin.yaml

# Scale to 3 replicas for outlier detection testing
kubectl scale deployment httpbin -n cb-test --replicas=3

# Deploy load generator
kubectl apply -n cb-test -f - <<EOF
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

kubectl wait --for=condition=ready pod -l app=httpbin -n cb-test --timeout=60s
kubectl wait --for=condition=ready pod -l app=fortio -n cb-test --timeout=60s
```

## Test 1: Connection Pool Circuit Breaker

Configure a connection pool with known limits:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-cb
  namespace: cb-test
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 20
```

```bash
kubectl apply -n cb-test -f httpbin-cb.yaml
```

### Baseline: Under the Limit

Send traffic within the limits:

```bash
FORTIO_POD=$(kubectl get pod -n cb-test -l app=fortio -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n cb-test $FORTIO_POD -- fortio load \
  -c 5 \
  -qps 0 \
  -t 30s \
  http://httpbin.cb-test.svc.cluster.local:8000/get
```

All requests should return 200. If you see any 503s at 5 concurrent connections with a limit of 10, something is wrong with your configuration.

### Over the Limit

Now exceed the limit:

```bash
kubectl exec -n cb-test $FORTIO_POD -- fortio load \
  -c 30 \
  -qps 0 \
  -t 30s \
  http://httpbin.cb-test.svc.cluster.local:8000/get
```

You should see 503 responses appearing. The exact ratio depends on how fast httpbin processes requests, but with 30 concurrent connections against a limit of 10, you should see a significant number of rejects.

### Verify the Overflow Counter

```bash
kubectl exec -n cb-test $FORTIO_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep "httpbin.*overflow"
```

You should see `upstream_rq_pending_overflow` with a nonzero value. This confirms the circuit breaker is tripping.

## Test 2: Outlier Detection Circuit Breaker

Outlier detection watches for error rates and ejects bad instances. First, configure it:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-outlier
  namespace: cb-test
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

```bash
kubectl apply -n cb-test -f httpbin-outlier.yaml
```

This says: if an instance returns 3 consecutive 5xx errors, eject it for 30 seconds. Up to 100% of instances can be ejected.

### Make One Instance Return Errors

We need to make one of the three httpbin pods return errors. We can do this by exec-ing into the pod and stopping the httpbin process, or we can use a more controlled approach.

Use Istio fault injection with header matching to target a specific pod indirectly. A simpler approach is to kill the httpbin process in one pod:

```bash
# Get the pods
kubectl get pods -n cb-test -l app=httpbin -o name

# Kill httpbin in the first pod (it will restart, but there's a window)
BAD_POD=$(kubectl get pod -n cb-test -l app=httpbin -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n cb-test $BAD_POD -c httpbin -- kill 1
```

The pod will restart, but during the restart period, requests to that instance will fail. The outlier detection should eject it.

### A More Controlled Approach

Deploy a fourth instance that always returns errors:

```bash
kubectl apply -n cb-test -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin-bad
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
      version: bad
  template:
    metadata:
      labels:
        app: httpbin
        version: bad
    spec:
      containers:
      - name: httpbin
        image: docker.io/kennethreitz/httpbin
        command: ["python", "-c", "
from flask import Flask;
app = Flask(__name__);
@app.route('/', defaults={'path': ''});
@app.route('/<path:path>');
def catch_all(path): return 'error', 500;
app.run(host='0.0.0.0', port=8000)
"]
        ports:
        - containerPort: 8000
EOF
```

Wait for the bad pod to be ready:

```bash
kubectl wait --for=condition=ready pod -l version=bad -n cb-test --timeout=60s
```

Now send traffic. Some requests will hit the bad pod and get 500s. After 3 consecutive errors, outlier detection should eject it:

```bash
kubectl exec -n cb-test $FORTIO_POD -- fortio load \
  -c 4 \
  -qps 10 \
  -t 60s \
  http://httpbin.cb-test.svc.cluster.local:8000/get
```

Initially you will see some 500 errors. After about 5-10 seconds, the outlier detection should kick in and eject the bad pod. The error rate should drop to zero.

### Verify Ejection

Check the outlier detection stats:

```bash
kubectl exec -n cb-test $FORTIO_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection"
```

Look for:

```text
cluster.outbound|8000||httpbin.cb-test.svc.cluster.local.outlier_detection.ejections_active: 1
cluster.outbound|8000||httpbin.cb-test.svc.cluster.local.outlier_detection.ejections_total: 1
cluster.outbound|8000||httpbin.cb-test.svc.cluster.local.outlier_detection.ejections_consecutive_5xx: 1
```

`ejections_active: 1` means one instance is currently ejected.

## Test 3: Verify Recovery After Ejection

After the base ejection time (30 seconds in our config), the ejected instance should be returned to the pool. If it is still unhealthy, it will get ejected again quickly.

Monitor the ejections over time:

```bash
for i in $(seq 1 12); do
  EJECTIONS=$(kubectl exec -n cb-test $FORTIO_POD -c istio-proxy -- \
    pilot-agent request GET stats 2>/dev/null | grep "ejections_active" | awk -F: '{print $2}')
  echo "$(date +%H:%M:%S) - Active ejections: $EJECTIONS"
  sleep 10
done
```

You should see the ejection count go to 1, then back to 0 after the base ejection time, then back to 1 when the bad pod gets ejected again.

## Test 4: Max Ejection Percentage

The `maxEjectionPercent` controls how many instances can be ejected simultaneously. Test with a restrictive setting:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-outlier-limited
  namespace: cb-test
spec:
  host: httpbin
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 5s
      baseEjectionTime: 60s
      maxEjectionPercent: 30
```

With 4 instances (3 good + 1 bad), 30% means at most 1 instance can be ejected. This is usually what you want in production because you do not want outlier detection to remove all instances and cause a complete outage.

## Test 5: Combined Load + Fault Injection

The most realistic test combines Istio fault injection with the circuit breaker to simulate a production incident:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: httpbin-fault
  namespace: cb-test
spec:
  hosts:
  - httpbin
  http:
  - fault:
      abort:
        percentage:
          value: 30
        httpStatus: 500
      delay:
        percentage:
          value: 20
        fixedDelay: 3s
    route:
    - destination:
        host: httpbin
```

```bash
kubectl apply -n cb-test -f httpbin-fault.yaml

kubectl exec -n cb-test $FORTIO_POD -- fortio load \
  -c 20 \
  -qps 0 \
  -t 60s \
  http://httpbin.cb-test.svc.cluster.local:8000/get
```

This simulates a service that is both slow and error-prone. The circuit breaker should start ejecting instances that return too many errors, and the connection pool should prevent request pile-up from the delays.

## Building a Validation Checklist

For each circuit breaker configuration, validate these behaviors:

1. Traffic within limits works normally (0% error rate)
2. Traffic beyond connection pool limits gets rejected with 503
3. Unhealthy instances get ejected after the configured error threshold
4. Ejected instances are returned to the pool after the base ejection time
5. Max ejection percentage is respected
6. The system recovers fully when the fault is removed

## Cleanup

```bash
kubectl delete namespace cb-test
```

Circuit breakers only work if you test them. The configurations are easy to get wrong because the interaction between connection pool limits, outlier detection, and your actual traffic patterns is hard to predict. Run these tests every time you change circuit breaker settings, and include them in your CI/CD pipeline to catch regressions.
