# How to Test Service Resilience with Istio Delays

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Resilience Testing, Fault Injection, Latency, Kubernetes

Description: Learn how to use Istio delay injection to test whether your services handle slow dependencies correctly and degrade gracefully.

---

Slow services cause more problems than dead ones. When a service is completely down, your error handling kicks in immediately. When it is just slow, requests pile up, thread pools get exhausted, connection timeouts cascade, and suddenly your entire system grinds to a halt. This is why testing for latency is just as important as testing for failures.

Istio makes it easy to inject artificial delays into service-to-service communication. You can add fixed delays or vary the delay across a percentage of traffic, all without touching your application code.

## Setting Up the Test

Deploy a multi-service application. The Bookinfo sample works well because it has a chain of service calls:

```bash
kubectl create namespace delay-test
kubectl label namespace delay-test istio-injection=enabled

kubectl apply -n delay-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -n delay-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/destination-rule-all.yaml
```

Wait for all pods:

```bash
kubectl wait --for=condition=ready pod --all -n delay-test --timeout=120s
```

## Basic Delay Injection

Add a 3-second delay to all requests going to the ratings service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-delay
  namespace: delay-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 3s
    route:
    - destination:
        host: ratings
```

```bash
kubectl apply -n delay-test -f ratings-delay.yaml
```

Test the impact:

```bash
time kubectl exec -n delay-test deploy/productpage-v1 -- \
  curl -s ratings:9080/ratings/0
```

You should see the request take about 3 seconds longer than normal. The delay is added by the Envoy sidecar on the ratings service side before the request reaches the application.

## Partial Delay Injection

In production, degradation is rarely all-or-nothing. Inject delays into only a portion of traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-partial-delay
  namespace: delay-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      delay:
        percentage:
          value: 25
        fixedDelay: 5s
    route:
    - destination:
        host: ratings
```

With this configuration, 25% of requests to the ratings service will have a 5-second delay. The other 75% proceed normally. This is a great way to test:

- Does the caller service's p99 latency spike?
- Do retries make the problem worse?
- Does the circuit breaker eventually open?

## Testing Timeout Configuration

One of the most common uses for delay injection is verifying that your timeouts are configured correctly. Set a delay longer than your expected timeout:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-timeout-test
  namespace: delay-test
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
    timeout: 2s
```

Now inject a 5-second delay on the reviews service dependency:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-slow
  namespace: delay-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 5s
    route:
    - destination:
        host: ratings
```

The reviews service calls ratings, but the productpage has a 2-second timeout on reviews. So the expected behavior is:

1. Productpage calls reviews
2. Reviews calls ratings (which is delayed 5 seconds)
3. After 2 seconds, productpage times out on reviews
4. Productpage shows the page without reviews data

Test it:

```bash
time kubectl exec -n delay-test deploy/productpage-v1 -- \
  curl -s -o /dev/null -w "%{http_code}" productpage:9080/productpage
```

If the timeout is working, the request should complete in about 2 seconds, not 5.

## Graduated Delay Testing

Start small and increase delays gradually to find the breaking point:

```bash
for delay in 100ms 500ms 1s 2s 5s 10s; do
  cat <<EOF | kubectl apply -n delay-test -f -
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-delay
  namespace: delay-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: $delay
    route:
    - destination:
        host: ratings
EOF

  sleep 5  # Wait for config to propagate

  echo "=== Delay: $delay ==="
  kubectl exec -n delay-test deploy/productpage-v1 -- \
    curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" \
    productpage:9080/productpage
done
```

This reveals at what delay threshold the system starts behaving differently.

## Testing with Load

Delays are most dangerous under load because slow requests hold connections open. Combine delay injection with load testing:

```bash
kubectl apply -n delay-test -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: fortio-client
  labels:
    app: fortio-client
spec:
  containers:
  - name: fortio
    image: fortio/fortio:latest
    ports:
    - containerPort: 8080
EOF
```

Run load with the delay active:

```bash
# First, baseline without delay
kubectl delete virtualservice ratings-delay -n delay-test 2>/dev/null
kubectl exec -n delay-test fortio-client -- fortio load \
  -c 16 -qps 0 -t 30s \
  http://productpage.delay-test.svc.cluster.local:9080/productpage

# Now with a 2-second delay on 50% of ratings requests
kubectl apply -n delay-test -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-delay
  namespace: delay-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      delay:
        percentage:
          value: 50
        fixedDelay: 2s
    route:
    - destination:
        host: ratings
EOF

sleep 5
kubectl exec -n delay-test fortio-client -- fortio load \
  -c 16 -qps 0 -t 30s \
  http://productpage.delay-test.svc.cluster.local:9080/productpage
```

Compare the QPS and latency distribution between the two runs. You should see a significant drop in throughput because half the requests are holding connections open for 2 extra seconds.

## Testing Connection Pool Exhaustion

Delays can exhaust connection pools. Combine delay injection with connection pool limits to test this:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: ratings-pool
  namespace: delay-test
spec:
  host: ratings
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 10
        http2MaxRequests: 20
```

With a 5-second delay and only 10 max connections, requests will start queuing up quickly once you send more than 2 requests per second. This tests whether your services handle connection pool overflow gracefully with proper error codes (503) rather than hanging indefinitely.

## Monitoring the Impact

While running delay experiments, check Envoy stats for timeout and retry behavior:

```bash
PRODUCTPAGE_POD=$(kubectl get pod -n delay-test -l app=productpage -o jsonpath='{.items[0].metadata.name}')

# Check upstream timeouts
kubectl exec -n delay-test $PRODUCTPAGE_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_timeout"

# Check pending requests
kubectl exec -n delay-test $PRODUCTPAGE_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_pending"
```

## Cleanup

```bash
kubectl delete namespace delay-test
```

Delay injection is one of the most valuable chaos engineering techniques because slow dependencies are the most common cause of cascading failures in distributed systems. By regularly testing with injected delays, you can verify that your timeouts, circuit breakers, and graceful degradation patterns actually work the way you expect them to.
