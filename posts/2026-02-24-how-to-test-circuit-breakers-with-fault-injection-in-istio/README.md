# How to Test Circuit Breakers with Fault Injection in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Circuit Breaker, Fault Injection, DestinationRule, Resilience

Description: How to validate Istio circuit breaker configuration using fault injection to verify that outlier detection and connection limits work as expected.

---

Circuit breakers prevent cascading failures by stopping requests to unhealthy upstream services. In Istio, circuit breaking is configured through DestinationRules with connection pool limits and outlier detection. But how do you know your circuit breaker configuration actually works? You can stare at the YAML all day, but until you trigger it with real failures, you're guessing.

Fault injection gives you a controlled way to trigger circuit breakers and verify their behavior. This post shows how to set up circuit breakers, inject faults to trigger them, and validate that they protect your system as intended.

## Circuit Breakers in Istio: Quick Review

Istio has two types of circuit breaking mechanisms:

**Connection Pool Limits**: Cap the number of connections and pending requests. When the limit is hit, excess requests get a 503 immediately.

**Outlier Detection**: Tracks error rates per upstream instance. When an instance exceeds the error threshold, it gets ejected from the load balancing pool for a configurable duration.

Both are configured in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

## Test 1: Triggering Connection Pool Limits

Connection pool limits trip when there are too many concurrent connections or pending requests. To trigger this, you need to create enough concurrent load while slowing down the upstream with delay injection.

Set up the DestinationRule with tight limits:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 1
        http2MaxRequests: 1
```

Inject a delay to slow responses and cause requests to queue up:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
  namespace: production
spec:
  hosts:
    - payment-service
  http:
    - fault:
        delay:
          fixedDelay: 3s
          percentage:
            value: 100.0
      route:
        - destination:
            host: payment-service
```

Now send concurrent requests:

```bash
# Send 10 concurrent requests
for i in $(seq 1 10); do
  kubectl exec deploy/test-client -n production -- curl -s -o /dev/null -w "Request $i: %{http_code}\n" http://payment-service:8080/charge &
done
wait
```

With `http1MaxPendingRequests: 1` and `http2MaxRequests: 1`, only one request is actively being processed and one can be pending. The other 8 requests should get immediate 503 errors with the `UO` (upstream overflow) response flag.

Check the access logs to confirm:

```bash
kubectl logs deploy/test-client -c istio-proxy -n production | grep "payment-service" | tail -10
```

Look for `UO` in the response flags, which indicates the circuit breaker tripped.

## Test 2: Triggering Outlier Detection

Outlier detection ejects specific upstream instances that return too many errors. To test this, you need multiple replicas of the upstream and a way to make one of them fail.

First, scale the upstream:

```bash
kubectl scale deploy/payment-service -n production --replicas=3
```

Then inject abort faults. Since fault injection applies at the proxy level, all instances behave the same. To test outlier detection more realistically, you can deploy a "bad" instance:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service-bad
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: payment-service
      version: bad
  template:
    metadata:
      labels:
        app: payment-service
        version: bad
    spec:
      containers:
        - name: payment-service
          image: hashicorp/http-echo
          args:
            - "-status-code=500"
            - "-text=error"
            - "-listen=:8080"
          ports:
            - containerPort: 8080
```

This creates a pod that always returns 500 errors. With outlier detection configured:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

After the bad instance returns 3 consecutive 5xx errors, outlier detection ejects it for 30 seconds. Subsequent requests only go to the healthy instances.

Alternatively, use fault injection with a VirtualService that targets a specific subset:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  subsets:
    - name: healthy
      labels:
        version: v1
    - name: faulty
      labels:
        version: v2
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## Test 3: Verifying Ejection and Recovery

To verify that outlier detection is working, check the proxy's cluster stats:

```bash
# Check ejection stats
kubectl exec deploy/test-client -c istio-proxy -n production -- curl -s localhost:15000/stats | grep "payment-service.*ejection"
```

You should see stats like:

```
cluster.outbound|8080||payment-service.production.svc.cluster.local.outlier_detection.ejections_active: 1
cluster.outbound|8080||payment-service.production.svc.cluster.local.outlier_detection.ejections_total: 2
cluster.outbound|8080||payment-service.production.svc.cluster.local.outlier_detection.ejections_consecutive_5xx: 2
```

Check endpoint health:

```bash
istioctl proxy-config endpoints deploy/test-client -n production --cluster "outbound|8080||payment-service.production.svc.cluster.local"
```

Ejected instances show as `UNHEALTHY`:

```
ENDPOINT         STATUS      OUTLIER CHECK   CLUSTER
10.1.2.3:8080    HEALTHY     OK              outbound|8080||payment-service
10.1.2.4:8080    HEALTHY     OK              outbound|8080||payment-service
10.1.2.5:8080    UNHEALTHY   FAILED          outbound|8080||payment-service
```

After `baseEjectionTime` (30 seconds), the ejected instance is added back and given another chance.

## Test 4: Combining Fault Injection with Circuit Breaking

Here's a complete scenario that tests both mechanisms together:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 20
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 100
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
  namespace: production
spec:
  hosts:
    - payment-service
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 40.0
        delay:
          fixedDelay: 2s
          percentage:
            value: 30.0
      route:
        - destination:
            host: payment-service
```

This creates a complex failure scenario:
- 40% of requests get immediate 503 errors
- 30% of remaining requests are delayed by 2 seconds
- Delayed requests may pile up and hit connection pool limits
- Repeated 503s trigger outlier detection on affected endpoints

Monitor the combined behavior:

```bash
# Watch circuit breaker stats in real-time
watch -n 2 'kubectl exec deploy/test-client -c istio-proxy -n production -- curl -s localhost:15000/stats | grep "payment-service.*\(overflow\|ejection\|pending\)"'
```

## Reading the Response Flags

When circuit breakers activate, the proxy access logs include specific response flags:

| Flag | Meaning |
|---|---|
| `UO` | Upstream overflow - connection pool limit hit |
| `UH` | No healthy upstream - all instances ejected |
| `URX` | Upstream retry limit exceeded |

```bash
# Count each response flag type
kubectl logs deploy/test-client -c istio-proxy -n production | grep "payment-service" | grep -oP '"response_flags":"[^"]*"' | sort | uniq -c
```

## Clean Up

After testing, remove the fault injection and reset the circuit breaker to production values:

```bash
kubectl delete virtualservice payment-service -n production
kubectl delete deployment payment-service-bad -n production

# Apply production-ready DestinationRule
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
EOF
```

Testing circuit breakers with fault injection is one of those things that takes an hour to set up but can save you from a multi-hour production incident. Do it before you need it, and you'll know exactly how your circuit breakers behave when things go wrong.
