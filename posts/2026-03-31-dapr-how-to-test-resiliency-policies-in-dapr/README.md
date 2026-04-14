# How to Test Resiliency Policies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Testing, Chaos Engineering, Microservice

Description: Learn how to test Dapr resiliency policies by simulating failures, observing retry behavior, and verifying circuit breakers work correctly in your microservices.

---

## Why Test Resiliency Policies

Configuring resiliency policies without testing them is risky - a misconfigured retry policy might loop indefinitely, a circuit breaker might never open, or timeouts might be set too short for normal operations. Testing resiliency ensures your configuration actually protects the system under failure conditions.

## Prerequisites

- A Dapr application with resiliency policies configured
- Dapr CLI and kubectl installed
- A way to inject failures (mocked service, chaos tools, or manual injection)

## Set Up a Test Environment

Start with a simple resiliency configuration for testing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: test-resiliency
  namespace: test
spec:
  policies:
    retries:
      test-retry:
        policy: exponential
        duration: 1s
        maxInterval: 10s
        maxRetries: 3
    timeouts:
      test-timeout: 5s
    circuitBreakers:
      test-cb:
        maxRequests: 1
        interval: 10s
        timeout: 15s
        trip: consecutiveFailures >= 3
  targets:
    apps:
      flaky-service:
        retry: test-retry
        timeout: test-timeout
        circuitBreaker: test-cb
```

## Create a Flaky Test Service

Build a service that can be configured to fail on demand:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

let failureMode = 'none'; // 'none', 'always', 'flaky', 'slow'
let failureCount = 0;
let requestCount = 0;

// Control endpoint (not exposed externally)
app.post('/admin/failure-mode', (req, res) => {
  failureMode = req.body.mode;
  failureCount = 0;
  requestCount = 0;
  console.log(`Failure mode set to: ${failureMode}`);
  res.json({ mode: failureMode });
});

// The service endpoint being tested
app.get('/api/data', (req, res) => {
  requestCount++;
  console.log(`Request #${requestCount}, mode: ${failureMode}`);

  if (failureMode === 'always') {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  if (failureMode === 'flaky' && requestCount % 3 !== 0) {
    failureCount++;
    return res.status(500).json({ error: 'Transient error', attempt: requestCount });
  }

  if (failureMode === 'slow') {
    setTimeout(() => {
      res.json({ data: 'response after delay', requestCount });
    }, 10000); // 10 second delay (exceeds timeout)
    return;
  }

  res.json({ data: 'success', requestCount });
});

app.listen(3001, () => console.log('Flaky service on :3001'));
```

## Test Retry Behavior

Set the flaky service to fail the first 2 requests:

```bash
# Configure flaky service to fail every request except every 3rd
curl -X POST http://flaky-service/admin/failure-mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "flaky"}'

# Invoke through Dapr from your test service
curl -X GET \
  "http://localhost:3500/v1.0/invoke/flaky-service/method/api/data"
```

Observe the Dapr sidecar logs to confirm retries are happening:

```bash
kubectl logs deployment/my-app -c daprd | grep -i "retry\|attempt\|resiliency"
```

Expected output:

```text
INFO  Resiliency policy test-retry applied to request to flaky-service
WARN  Request to flaky-service failed, retrying (attempt 1/3)
WARN  Request to flaky-service failed, retrying (attempt 2/3)
INFO  Request to flaky-service succeeded on attempt 3
```

## Test Circuit Breaker

Configure the service to always fail:

```bash
curl -X POST http://flaky-service/admin/failure-mode \
  -d '{"mode": "always"}'
```

Send several requests and observe the circuit breaker opening:

```javascript
async function testCircuitBreaker() {
  const results = [];

  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(
        'http://localhost:3500/v1.0/invoke/flaky-service/method/api/data'
      );
      results.push({ attempt: i + 1, status: response.status, type: 'request' });
    } catch (err) {
      results.push({ attempt: i + 1, error: err.message, type: 'circuit-open' });
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('Circuit breaker test results:');
  results.forEach(r => console.log(JSON.stringify(r)));
}
```

Expected behavior:
- Attempts 1-3: actual HTTP calls, all fail with 503
- Attempt 4+: circuit opens, Dapr returns error immediately without calling service
- After 15 seconds: circuit enters half-open, one probe request allowed

## Test Timeout Behavior

```bash
# Set service to respond slowly (10s > 5s timeout)
curl -X POST http://flaky-service/admin/failure-mode \
  -d '{"mode": "slow"}'

# This request should fail with a timeout error
time curl http://localhost:3500/v1.0/invoke/flaky-service/method/api/data
```

The request should fail after approximately 5 seconds (the configured timeout), not 10 seconds.

## Write Automated Resiliency Tests

```python
import requests
import time

DAPR_URL = "http://localhost:3500/v1.0/invoke/flaky-service/method/api/data"
ADMIN_URL = "http://flaky-service-admin/failure-mode"

def test_retry_on_transient_failure():
    # Set flaky mode
    requests.post(ADMIN_URL, json={"mode": "flaky"})

    start = time.time()
    response = requests.get(DAPR_URL)
    elapsed = time.time() - start

    # Should succeed eventually due to retries
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    # Should have taken some time due to retries
    assert elapsed > 1.0, f"Expected retries to add delay, elapsed: {elapsed}s"
    print(f"PASS: retry test succeeded in {elapsed:.1f}s")

def test_circuit_breaker_opens():
    requests.post(ADMIN_URL, json={"mode": "always"})

    responses = []
    for i in range(6):
        r = requests.get(DAPR_URL)
        responses.append(r.status_code)
        time.sleep(0.5)

    # First few should attempt, later ones should fail fast (circuit open)
    assert all(s != 200 for s in responses), "Expected all requests to fail"
    print("PASS: circuit breaker opened as expected")

test_retry_on_transient_failure()
test_circuit_breaker_opens()
```

## Monitor Resiliency Metrics

Dapr exports resiliency metrics to Prometheus. Query them to verify policy behavior:

```bash
# Check resiliency policy execution count
curl http://localhost:9090/api/v1/query?query=dapr_resiliency_count{policy_name="test-retry"}

# Check circuit breaker state changes
curl http://localhost:9090/api/v1/query?query=dapr_resiliency_cb_state{name="test-cb"}
```

## Summary

Testing Dapr resiliency policies requires simulating failure conditions - transient errors for retry testing, sustained failures for circuit breaker testing, and artificial delays for timeout testing. A controllable "flaky service" is an effective tool for this. Combined with Dapr sidecar log analysis and Prometheus metrics, you can verify that retries fire on schedule, circuit breakers open at the right threshold, and timeouts prevent indefinite blocking under all failure scenarios.
