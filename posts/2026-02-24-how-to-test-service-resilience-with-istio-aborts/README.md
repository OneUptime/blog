# How to Test Service Resilience with Istio Aborts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Resilience Testing, Fault Injection, Error Handling, Kubernetes

Description: How to use Istio abort fault injection to test service error handling, fallback behavior, and graceful degradation under failure conditions.

---

When a backend service fails, the calling service needs to handle that failure gracefully. Maybe it shows cached data, falls back to a default, or displays a friendly error message. But how do you know your error handling actually works? Most teams only find out during real incidents, which is the worst possible time to discover a bug in your fallback logic.

Istio abort injection lets you force services to return specific HTTP error codes without actually breaking anything. The Envoy sidecar intercepts the request and immediately returns the error code before the request ever reaches the backend application. This is clean, controllable, and completely reversible.

## Setting Up

Deploy the test environment:

```bash
kubectl create namespace abort-test
kubectl label namespace abort-test istio-injection=enabled

kubectl apply -n abort-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -n abort-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/destination-rule-all.yaml

kubectl wait --for=condition=ready pod --all -n abort-test --timeout=120s
```

## Basic Abort Injection

Inject a 503 Service Unavailable error on the ratings service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-abort
  namespace: abort-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 503
    route:
    - destination:
        host: ratings
```

```bash
kubectl apply -n abort-test -f ratings-abort.yaml
```

Test it:

```bash
kubectl exec -n abort-test deploy/productpage-v1 -- \
  curl -s -w "\nHTTP Status: %{http_code}\n" ratings:9080/ratings/0
```

You should get a 503 response immediately. The request never reaches the ratings application.

## Testing Different Error Codes

Different error codes trigger different behavior in well-written clients. Test each one:

### 400 Bad Request
```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-abort
  namespace: abort-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 400
    route:
    - destination:
        host: ratings
```

A 400 means the client sent something wrong. Your caller should not retry on this because the request will never succeed.

### 429 Too Many Requests
```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-abort
  namespace: abort-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 429
    route:
    - destination:
        host: ratings
```

A 429 means rate limiting. The caller should back off and retry after a delay.

### 500 Internal Server Error
```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-abort
  namespace: abort-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 500
    route:
    - destination:
        host: ratings
```

A 500 is a server-side issue. The caller might retry, but should have a limit.

### 504 Gateway Timeout
```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-abort
  namespace: abort-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 504
    route:
    - destination:
        host: ratings
```

A 504 means an upstream took too long. This is common in service meshes when a downstream dependency is slow.

## Partial Abort Injection

Inject errors into only a subset of requests to simulate flaky services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-flaky
  namespace: abort-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 30
        httpStatus: 500
    route:
    - destination:
        host: ratings
```

With 30% of requests failing, you can test:
- Does the retry logic work? Do retried requests eventually succeed?
- What does the user experience look like when some requests fail?
- Does the circuit breaker activate after enough failures?

Run multiple requests to see the distribution:

```bash
for i in $(seq 1 20); do
  kubectl exec -n abort-test deploy/productpage-v1 -- \
    curl -s -o /dev/null -w "%{http_code}\n" ratings:9080/ratings/0
done
```

You should see roughly 14 successes (200) and 6 failures (500) out of 20 requests.

## Testing Retry Behavior

Combine abort injection with Istio retry policies to verify retries work:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-with-retry
  namespace: abort-test
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx
```

Now inject 50% failures on reviews:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-flaky
  namespace: abort-test
spec:
  hosts:
  - reviews
  http:
  - fault:
      abort:
        percentage:
          value: 50
        httpStatus: 503
    route:
    - destination:
        host: reviews
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx
```

Wait, you cannot have both a fault and retries in the same VirtualService for the same host because the fault is applied before the route. The fault injection happens on the server side. The retries are configured on the client side. So you need two separate VirtualServices or configure them appropriately.

The correct approach is to have the fault on the ratings VirtualService and the retries on the reviews VirtualService (since reviews calls ratings):

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-abort
  namespace: abort-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 50
        httpStatus: 503
    route:
    - destination:
        host: ratings
```

The retry policy is configured on the caller's side through its own VirtualService or DestinationRule.

## Header-Based Abort for Safe Production Testing

Target specific test traffic using header matching:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-abort-testonly
  namespace: abort-test
spec:
  hosts:
  - ratings
  http:
  - match:
    - headers:
        x-test-chaos:
          exact: "true"
    fault:
      abort:
        percentage:
          value: 100
        httpStatus: 500
    route:
    - destination:
        host: ratings
  - route:
    - destination:
        host: ratings
```

Only requests with `x-test-chaos: true` header will get errors. Everyone else is unaffected:

```bash
# This fails
kubectl exec -n abort-test deploy/productpage-v1 -- \
  curl -s -w "%{http_code}\n" -H "x-test-chaos: true" ratings:9080/ratings/0

# This succeeds
kubectl exec -n abort-test deploy/productpage-v1 -- \
  curl -s -w "%{http_code}\n" ratings:9080/ratings/0
```

## Verifying Graceful Degradation

The real goal of abort testing is to verify graceful degradation. A well-designed system should:

1. **Not cascade failures**: If ratings is down, the productpage should still show book details and reviews, just without star ratings.

2. **Return partial data**: The response should include whatever data is available from healthy services.

3. **Include meaningful error information**: Error responses should tell the client what went wrong.

4. **Not retry indefinitely**: Failed requests should be abandoned after a reasonable number of retries.

Test the full page with ratings down:

```bash
kubectl exec -n abort-test deploy/productpage-v1 -- \
  curl -s productpage:9080/productpage | grep -c "Ratings service"
```

## Checking Envoy Stats

Monitor abort injection through Envoy statistics:

```bash
RATINGS_POD=$(kubectl get pod -n abort-test -l app=ratings -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n abort-test $RATINGS_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep "fault"
```

You should see counters like:

```
http.inbound_0.0.0.0_9080.fault.aborts_injected: 1523
http.inbound_0.0.0.0_9080.fault.delays_injected: 0
```

## Cleanup

```bash
kubectl delete namespace abort-test
```

Abort injection is one of the simplest and most effective chaos engineering techniques. It requires zero application changes, is completely reversible, and can be scoped to specific traffic using header matching. Make it a regular part of your testing routine and you will catch error handling bugs long before they hit production.
