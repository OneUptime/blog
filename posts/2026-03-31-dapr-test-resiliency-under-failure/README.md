# How to Test Dapr Resiliency Under Failure Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Testing, Circuit Breaker, Retry

Description: Systematically test Dapr resiliency policies including retries, circuit breakers, and timeouts under real failure conditions using chaos injection and metric validation.

---

## Dapr Resiliency Policies Overview

Dapr's resiliency building block applies fault tolerance policies at the sidecar level, transparently to your application. The three core policies are:

- **Timeouts** - cancel operations that take too long
- **Retries** - retry transient failures with backoff
- **Circuit breakers** - stop sending requests to a failing target

## Define a Complete Resiliency Policy

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: full-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      defaultTimeout: 3s
      longOperationTimeout: 15s
    retries:
      defaultRetry:
        policy: exponential
        maxRetries: 5
        duration: 200ms
        maxInterval: 10s
        matching:
          httpStatusCodes: "429,500,502,503,504"
          gRPCStatusCodes: "UNAVAILABLE,RESOURCE_EXHAUSTED"
    circuitBreakers:
      defaultCircuitBreaker:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      orderservice:
        timeout: defaultTimeout
        retry: defaultRetry
        circuitBreaker: defaultCircuitBreaker
    components:
      statestore:
        outbound:
          timeout: defaultTimeout
          retry: defaultRetry
          circuitBreaker: defaultCircuitBreaker
```

```bash
kubectl apply -f full-resiliency.yaml
```

## Test Retry Policy

Inject failures and verify retries occur. Use a test server that fails N times before succeeding:

```python
from flask import Flask, request
import threading

app = Flask(__name__)
call_count = threading.local()

@app.route('/method/getorder', methods=['GET', 'POST'])
def get_order():
    if not hasattr(call_count, 'n'):
        call_count.n = 0
    call_count.n += 1
    if call_count.n < 4:  # Fail first 3 times
        return '', 503
    call_count.n = 0
    return {'orderId': '123', 'status': 'ok'}

app.run(port=8080)
```

```bash
# Call through Dapr - should succeed after retries
curl http://localhost:3500/v1.0/invoke/flaky-service/method/getorder
```

## Test Circuit Breaker Trip and Reset

Verify the circuit breaker opens after repeated failures:

```bash
# Script to trigger circuit breaker
for i in {1..20}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3500/v1.0/invoke/orderservice/method/getorder)
  echo "Call $i: HTTP $RESPONSE"
  sleep 0.5
done
```

After 5 consecutive failures, you should see `500` responses immediately (circuit open), then after 30 seconds, one probe request succeeds and the circuit closes.

## Test Timeout Policy

Create an endpoint that sleeps longer than the configured timeout:

```go
func slowHandler(w http.ResponseWriter, r *http.Request) {
    time.Sleep(10 * time.Second) // Longer than 3s timeout
    w.WriteHeader(http.StatusOK)
}
```

```bash
# This should return 500 after 3 seconds due to Dapr timeout
time curl http://localhost:3500/v1.0/invoke/slowservice/method/slow
```

## Validate via Dapr Metrics

```bash
# Retry count metric
curl -s http://localhost:9090/api/v1/query \
  --data-urlencode 'query=dapr_resiliency_count{app_id="myapp",name="defaultRetry"}'

# Circuit breaker state (returns 4 series with status label: unknown, closed, half-open, open; current state has value 1)
curl -s http://localhost:9090/api/v1/query \
  --data-urlencode 'query=dapr_resiliency_cb_state{app_id="myapp",status="open"}'
```

## Automate with a Test Script

```bash
#!/bin/bash
set -e

echo "Testing Dapr resiliency policies..."

# Inject failure
kubectl scale deployment orderservice --replicas=0

# Send requests - should retry and eventually fail
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 30 \
  http://localhost:3500/v1.0/invoke/orderservice/method/health)

echo "Response during outage: $RESPONSE"
[ "$RESPONSE" = "500" ] && echo "PASS: Returned error after retries" || echo "FAIL"

# Restore service
kubectl scale deployment orderservice --replicas=1
kubectl wait --for=condition=available deployment/orderservice --timeout=60s

# Send request - should succeed
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3500/v1.0/invoke/orderservice/method/health)
[ "$RESPONSE" = "200" ] && echo "PASS: Recovered after restore" || echo "FAIL"
```

## Summary

Testing Dapr resiliency under failure conditions requires defining complete resiliency policies, using flaky test services to trigger retries, and verifying circuit breaker state transitions through metrics. Automated test scripts that inject failures and assert expected behavior make resiliency testing a repeatable part of your CI/CD pipeline.
