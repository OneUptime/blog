# How to Test Dapr Circuit Breakers Under Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Circuit Breaker, Load Testing, Resilience, Testing

Description: Test Dapr circuit breakers under load using k6 and hey to verify they trip correctly at failure thresholds, protect upstream services, and reset after recovery.

---

## Circuit Breaker Behavior in Dapr

Dapr implements the circuit breaker pattern at the sidecar level. The circuit has three states:
- **Closed** - requests flow normally
- **Open** - requests are rejected immediately (fast fail)
- **Half-Open** - one probe request is allowed to test recovery

Under load, circuit breakers prevent a failing dependency from being hammered with requests, giving it time to recover.

## Configure a Testable Circuit Breaker

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: cb-load-test
  namespace: default
spec:
  policies:
    circuitBreakers:
      loadTestCB:
        maxRequests: 2
        interval: 5s
        timeout: 20s
        trip: consecutiveFailures >= 3
    retries:
      noRetry:
        policy: constant
        maxRetries: 0
  targets:
    apps:
      flaky-service:
        circuitBreaker: loadTestCB
        retry: noRetry
```

Note: disable retries when specifically testing circuit breaker behavior to observe raw CB state transitions.

## Deploy a Flaky Test Service

```go
package main

import (
    "fmt"
    "net/http"
    "sync/atomic"
)

var requestCount int64

func handler(w http.ResponseWriter, r *http.Request) {
    count := atomic.AddInt64(&requestCount, 1)
    // Fail 5 out of every 10 requests (alternating groups of 5)
    if count%10 < 5 {
        w.WriteHeader(http.StatusServiceUnavailable)
        fmt.Fprint(w, "503 error")
        return
    }
    w.WriteHeader(http.StatusOK)
    fmt.Fprint(w, "ok")
}

func main() {
    http.HandleFunc("/check", handler)
    http.ListenAndServe(":8080", nil)
}
```

## Load Test with k6

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const cbOpen = new Counter('circuit_breaker_open');

export const options = {
    vus: 50,
    duration: '2m',
};

export default function () {
    const res = http.get('http://localhost:3500/v1.0/invoke/flaky-service/method/check');

    if (res.status === 503) {
        check(res, {
            'CB open - fast fail': (r) => r.body.includes('circuit breaker'),
        });
        cbOpen.add(1);
    } else {
        check(res, { 'success': (r) => r.status === 200 });
    }
    sleep(0.1);
}
```

```bash
k6 run circuit-breaker-load-test.js
```

## Load Test with hey

```bash
# Run 500 requests with 50 concurrent users
hey -n 500 -c 50 \
  http://localhost:3500/v1.0/invoke/flaky-service/method/check

# Expected output includes fast-fail 503s from open circuit
```

## Observe Circuit Breaker State in Dapr Metrics

```bash
# Poll circuit breaker state during load test
watch -n 1 'curl -s http://localhost:9090/api/v1/query \
  --data-urlencode "query=dapr_resiliency_cb_state{app_id=\"caller\",name=\"loadTestCB\"}" \
  | jq ".data.result[0].value[1]"'
```

Values: `0` = closed, `1` = half-open, `2` = open.

## Verify Recovery After Load Subsides

```bash
# After flaky service is fixed, verify circuit closes
for i in {1..10}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3500/v1.0/invoke/flaky-service/method/check)
  echo "$(date +%T): $STATUS"
  sleep 2
done
```

You should see: open (503 fast-fail) -> half-open (one probe request) -> closed (200 responses).

## Summary

Testing Dapr circuit breakers under load requires a flaky downstream service, a load generator like k6 or hey, and metric monitoring for CB state transitions. Validating that the circuit trips at the configured failure threshold, fast-fails during the open state, and correctly resets after recovery ensures your microservices remain protected under real production load.
