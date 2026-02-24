# How to Debug Why Retries Are Not Working in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retries, Traffic Management, Debugging, Kubernetes

Description: Troubleshooting guide for when Istio retry policies are not working as expected for failing requests in your service mesh.

---

You configured retries in your VirtualService but requests are still failing on the first error. Or worse, retries are happening when they shouldn't be, causing duplicate operations. Getting retries right in Istio requires understanding what the sidecar proxy actually retries and under what conditions. This guide walks through the common issues.

## How Istio Retries Work

Istio configures retries in the Envoy proxy. By default, Envoy retries failed requests up to 2 times. You can override this with a VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: production
spec:
  hosts:
    - my-service.production.svc.cluster.local
  http:
    - retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: "5xx,reset,connect-failure,retriable-4xx"
      route:
        - destination:
            host: my-service.production.svc.cluster.local
```

But there are conditions where retries won't trigger even with this configuration.

## Step 1: Verify the Retry Configuration

Check that your VirtualService is applied and the retry settings are in the proxy:

```bash
istioctl proxy-config routes deploy/my-client -n production -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for rc in data.get('dynamicRouteConfigs', data if isinstance(data, list) else []):
  if isinstance(rc, dict):
    config = rc.get('routeConfig', rc)
    for vh in config.get('virtualHosts', []):
      for route in vh.get('routes', []):
        ra = route.get('route', {})
        retry = ra.get('retryPolicy', {})
        if retry and 'my-service' in vh.get('name', ''):
          print(f\"Route: {vh.get('name', 'unknown')}\")
          print(f\"  Retry on: {retry.get('retryOn', 'none')}\")
          print(f\"  Attempts: {retry.get('numRetries', 'default')}\")
          print(f\"  Per-try timeout: {retry.get('perTryTimeout', 'none')}\")
"
```

If you don't see retry settings, the VirtualService might not be reaching the proxy. Check with `istioctl analyze`:

```bash
istioctl analyze -n production
```

## Step 2: Understand the retryOn Conditions

The `retryOn` field determines which failures trigger a retry. Each condition is specific:

- `5xx`: Server returned a 5xx status code
- `reset`: Connection was reset by the upstream
- `connect-failure`: Connection to upstream failed entirely
- `retriable-4xx`: Only retries on 409 Conflict
- `gateway-error`: Only retries on 502, 503, 504
- `retriable-status-codes`: Retries on specific status codes you define
- `retriable-headers`: Retries based on response headers

If your application returns a 400 Bad Request and you have `retryOn: "5xx"`, retries won't trigger because 400 is not a 5xx error.

Check what error codes your service is actually returning:

```bash
kubectl exec deploy/my-client -n production -c sleep -- \
  curl -v -o /dev/null -w "%{http_code}" my-service.production:8080/api
```

If you're getting 400 or 404 errors, those won't be retried by default. To retry specific status codes:

```yaml
retries:
  attempts: 3
  retryOn: "retriable-status-codes"
  retriableStatusCodes:
    - 503
    - 429
```

Wait, that's not quite how Istio exposes this. The `retryOn` field is a comma-separated string matching Envoy retry policies. For custom status codes, use:

```yaml
retries:
  attempts: 3
  retryOn: "5xx,retriable-status-codes"
```

And then the actual status codes are controlled at the Envoy level via headers or EnvoyFilter.

## Step 3: Check if the Request is Idempotent

Envoy has a built-in safety mechanism: by default, it only retries requests it considers safe to retry. POST requests are generally not retried because they might not be idempotent.

However, Istio overrides this behavior. With Istio's retry configuration, POST requests are retried by default. If they're not being retried, check if there's an EnvoyFilter or another configuration overriding the default behavior.

Verify with the proxy configuration:

```bash
istioctl proxy-config routes deploy/my-client -n production -o json | \
  python3 -m json.tool | grep -A 3 "retryPolicy"
```

## Step 4: Check the perTryTimeout

If `perTryTimeout` is too short, the retry happens but the request times out before the server can respond:

```yaml
retries:
  attempts: 3
  perTryTimeout: 100ms  # Too short! Server might need more time
```

Each retry gets `perTryTimeout` seconds to complete. If the server takes 500ms to respond and your `perTryTimeout` is 100ms, every retry will also timeout.

The total timeout for a request with retries is approximately: `attempts * perTryTimeout`. But there's also an overall route timeout that can cut retries short.

## Step 5: Check the Overall Route Timeout

The route timeout is the maximum time for the entire request, including all retries. By default, it's 15 seconds. If your retries exceed this, they get cut off:

```yaml
http:
  - timeout: 5s  # Overall timeout
    retries:
      attempts: 3
      perTryTimeout: 3s  # 3 attempts * 3s = 9s, but overall timeout is 5s!
    route:
      - destination:
          host: my-service.production.svc.cluster.local
```

In this example, the third retry will never complete because the 5s overall timeout will kill the request first. Set the overall timeout high enough to accommodate all retries:

```yaml
http:
  - timeout: 10s  # Must be >= attempts * perTryTimeout
    retries:
      attempts: 3
      perTryTimeout: 3s
```

Or disable the overall timeout by setting it to 0s (use with caution):

```yaml
http:
  - timeout: 0s  # No overall timeout
    retries:
      attempts: 3
      perTryTimeout: 5s
```

## Step 6: Verify Retries Are Happening

Check the Envoy stats to see retry counts:

```bash
kubectl exec deploy/my-client -n production -c istio-proxy -- \
  pilot-agent request GET stats | grep retry
```

Key metrics:

- `upstream_rq_retry`: Number of retries attempted
- `upstream_rq_retry_success`: Number of successful retries
- `upstream_rq_retry_overflow`: Retries that couldn't happen because the retry budget was exhausted
- `upstream_rq_retry_limit_exceeded`: Requests where max retries were hit

If `upstream_rq_retry` is 0 but you're seeing errors, retries aren't being triggered. Go back to the `retryOn` configuration.

If `upstream_rq_retry_overflow` is non-zero, the retry budget is exhausted. Envoy limits concurrent retries to prevent retry storms.

## Step 7: Check the Retry Budget

Envoy has a circuit breaker for retries. By default, only 20% of active requests can be retries. This prevents retry storms where retries cause more load, which causes more failures, which causes more retries.

Check the retry budget:

```bash
istioctl proxy-config clusters deploy/my-client -n production \
  --fqdn my-service.production.svc.cluster.local -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data:
  cb = c.get('circuitBreakers', {})
  thresholds = cb.get('thresholds', [{}])
  for t in thresholds:
    retry_budget = t.get('retryBudget', {})
    if retry_budget:
      print(f'Retry budget: {retry_budget}')
    else:
      max_retries = t.get('maxRetries', 'default (3)')
      print(f'Max retries: {max_retries}')
"
```

You can increase the retry budget with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: production
spec:
  host: my-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRetries: 10
```

## Step 8: Check for EnvoyFilters Overriding Retries

EnvoyFilters can modify retry behavior. Check if any exist:

```bash
kubectl get envoyfilter -n production
kubectl get envoyfilter -n istio-system
```

An EnvoyFilter might disable retries or modify the retry policy. Review each one.

## Step 9: Test Retries with Fault Injection

Inject a fault to verify retries work:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: test-retries
  namespace: production
spec:
  hosts:
    - my-service.production.svc.cluster.local
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 50
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: "5xx"
      route:
        - destination:
            host: my-service.production.svc.cluster.local
```

With 50% failure rate and 3 retry attempts, most requests should eventually succeed. Send 10 requests and count the successes:

```bash
for i in $(seq 1 10); do
  kubectl exec deploy/sleep -n production -c sleep -- \
    curl -s -o /dev/null -w "%{http_code} " my-service.production:8080/
done
echo ""
```

If you see mostly 200s, retries are working. If you see 503s, retries aren't triggering.

After testing, remove the fault injection:

```bash
kubectl delete virtualservice test-retries -n production
```

## Common Issues Summary

| Problem | Cause | Fix |
|---------|-------|-----|
| No retries at all | Wrong retryOn condition | Match retryOn to the error type |
| Retries timeout | perTryTimeout too short | Increase perTryTimeout |
| Retries cut off | Overall timeout too short | Set timeout >= attempts * perTryTimeout |
| Retry overflow | Retry budget exhausted | Increase maxRetries in DestinationRule |
| POST not retried | Envoy safety check | Check retry configuration explicitly |

Retry debugging is mostly about matching the failure type to the retry condition and making sure the timeouts are aligned. Use the Envoy stats to see what's actually happening, and test with fault injection to verify your configuration before relying on it in production.
