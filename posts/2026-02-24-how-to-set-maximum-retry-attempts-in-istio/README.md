# How to Set Maximum Retry Attempts in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retry Policy, VirtualService, Resilience, Traffic Management

Description: How to configure the maximum number of retry attempts in Istio, understand how attempt counting works, and choose the right number for your services.

---

Setting the right number of retry attempts is a balancing act. Too few retries and you pass transient errors to your users. Too many retries and you amplify load on struggling services, potentially making a bad situation worse. The `attempts` field in Istio's retry configuration controls how many additional tries the sidecar proxy makes after the initial request fails.

This post covers how to set max retry attempts in Istio, how the counting works, and how to choose a number that actually helps your system.

## How Retry Attempts Are Counted

The `attempts` field in a VirtualService retry configuration specifies the maximum number of retries, not the total number of attempts. So if you set `attempts: 3`, you get:

1. The original request (not counted as a retry)
2. First retry (attempt 1)
3. Second retry (attempt 2)
4. Third retry (attempt 3)

That's 4 total requests to the upstream. Here's the configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: catalog-service
  namespace: production
spec:
  hosts:
    - catalog-service
  http:
    - retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,connect-failure
      route:
        - destination:
            host: catalog-service
```

If the original request and all 3 retries fail, the caller receives the error from the last failed attempt.

## Setting Attempts: The Basics

The simplest configuration is just setting the attempt count:

```yaml
retries:
  attempts: 2
```

With `attempts: 2`, Istio retries up to 2 times. Combined with the original request, the upstream gets at most 3 requests.

To disable retries entirely:

```yaml
retries:
  attempts: 0
```

Setting attempts to 0 disables the retry policy for that route. The original request goes through, and if it fails, the error is returned immediately.

## Choosing the Right Number of Attempts

### For Most Services: 2-3 Retries

Two to three retries handles the vast majority of transient failures:

```yaml
retries:
  attempts: 2
  perTryTimeout: 2s
  retryOn: 5xx,connect-failure
```

With a 5% failure rate, the probability of all 3 attempts (original + 2 retries) failing is 0.05^3 = 0.0125% - effectively zero. Even with a 20% failure rate, all 3 failing is 0.2^3 = 0.8%.

The math shows diminishing returns beyond 3 retries:

| Failure Rate | 1 Retry | 2 Retries | 3 Retries | 5 Retries |
|---|---|---|---|---|
| 5% | 0.25% | 0.01% | 0.0006% | ~0% |
| 10% | 1% | 0.1% | 0.01% | 0.0001% |
| 20% | 4% | 0.8% | 0.16% | 0.006% |
| 50% | 25% | 12.5% | 6.25% | 1.56% |

Beyond 3 retries, the improvement is marginal for typical failure rates.

### For Idempotent Read Operations: 3 Retries

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: production
spec:
  hosts:
    - product-service
  http:
    - match:
        - method:
            exact: GET
      retries:
        attempts: 3
        perTryTimeout: 1s
        retryOn: 5xx,reset,connect-failure
      route:
        - destination:
            host: product-service
```

GET requests are safe to retry because they don't modify state. Three retries with a tight per-try timeout gives good resilience without too much latency overhead.

### For Write Operations: 0-1 Retries

```yaml
- match:
    - method:
        exact: POST
  retries:
    attempts: 1
    perTryTimeout: 5s
    retryOn: connect-failure
  route:
    - destination:
        host: order-service
```

Write operations need caution. Only retry on `connect-failure` (the request never reached the server) to avoid duplicate side effects. One retry is usually enough.

### For Critical Paths: Higher Attempts with Safeguards

If a particular call absolutely must succeed:

```yaml
retries:
  attempts: 5
  perTryTimeout: 1s
  retryOn: 5xx,connect-failure,reset
```

But pair this with a circuit breaker to prevent retry storms:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: critical-service
  namespace: production
spec:
  host: critical-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 15s
```

## Retry Attempts and Overall Timeout

The overall route timeout caps the total time for all attempts combined. Make sure your timeout is long enough to accommodate all retries:

```yaml
http:
  - timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
    route:
      - destination:
          host: my-service
```

In the worst case, 4 attempts at 3 seconds each = 12 seconds. But the overall timeout is 10 seconds, so the last attempt might get cut short. Adjust the numbers so they fit together.

A safe formula: `timeout >= (attempts + 1) * perTryTimeout`

In this example: `10s >= (3 + 1) * 3s = 12s` - the timeout is too short. Either increase the timeout to 12s or decrease perTryTimeout to 2.5s.

```yaml
# Fixed version
http:
  - timeout: 12s
    retries:
      attempts: 3
      perTryTimeout: 3s
    route:
      - destination:
          host: my-service
```

## Monitoring Retry Behavior

Track whether your retry configuration is actually helping:

```bash
# Check Envoy retry stats
kubectl exec deploy/frontend -c istio-proxy -n production -- curl -s localhost:15000/stats | grep retry
```

Key stats:

- `upstream_rq_retry`: Total number of retries attempted
- `upstream_rq_retry_success`: Retries that succeeded (the retry worked)
- `upstream_rq_retry_limit_exceeded`: Requests that exhausted all retries
- `upstream_rq_retry_overflow`: Retries rejected by the circuit breaker

If `retry_success` is high relative to `retry`, your retries are working well - most transient failures are being masked. If `retry_limit_exceeded` is high, either the upstream is having sustained failures (not transient), or you need more retries.

## Adjusting Attempts Based on Observations

Use the monitoring data to adjust:

**High retry_success, low retry_limit_exceeded**: Your retry count is appropriate. Transient failures are being handled.

**High retry_limit_exceeded**: Either:
- The upstream has persistent failures (retries won't help - fix the upstream)
- Your retry count is too low (increase attempts)
- Your perTryTimeout is too short (requests are timing out before they can complete)

**Very few retries happening**: Either your services are very healthy (great!) or your retryOn conditions don't match the failures you're seeing. Check what HTTP status codes the upstream returns.

```bash
# Check what status codes are coming from the upstream
kubectl logs deploy/frontend -c istio-proxy -n production | grep "catalog-service" | grep -oP '"response_code":"\K[^"]+' | sort | uniq -c | sort -rn
```

If the upstream returns 400 errors and your retryOn is `5xx`, no retries will happen. That's correct - 400 errors are client errors that should be fixed, not retried.

## Testing Your Retry Configuration

Use fault injection to verify retries work as expected:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: catalog-service
  namespace: production
spec:
  hosts:
    - catalog-service
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 50.0
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx
      route:
        - destination:
            host: catalog-service
```

With 50% abort rate and 3 retries, the effective failure rate should be about 6.25% (0.5^4). Send 100 requests and check:

```bash
success=0
fail=0
for i in $(seq 1 100); do
  code=$(kubectl exec deploy/test-client -n production -- curl -s -o /dev/null -w "%{http_code}" http://catalog-service:8080/products)
  if [ "$code" = "200" ]; then
    success=$((success + 1))
  else
    fail=$((fail + 1))
  fi
done
echo "Success: $success, Fail: $fail"
```

You should see roughly 93-94 successes and 6-7 failures.

## Summary Table

Quick reference for retry attempt recommendations:

| Scenario | Attempts | retryOn |
|---|---|---|
| General read API | 2-3 | `5xx,reset,connect-failure` |
| Write/mutation API | 0-1 | `connect-failure` |
| Internal microservice calls | 2 | `5xx,connect-failure` |
| Critical path | 3-5 | `5xx,reset,connect-failure` |
| gRPC services | 2-3 | `unavailable,cancelled,deadline-exceeded` |
| Database proxy | 1 | `connect-failure,reset` |

The right number of retry attempts depends on your specific failure patterns and tolerance for latency. Start with 2, monitor, and adjust from there.
