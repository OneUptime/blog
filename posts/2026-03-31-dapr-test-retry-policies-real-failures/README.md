# How to Test Dapr Retry Policies Under Real Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Retry, Policy, Testing, Resilience

Description: Validate Dapr retry policies by injecting real transient failures into services and infrastructure, then confirming retries fire at the correct intervals with proper backoff.

---

## Dapr Retry Policy Configuration

Dapr supports two retry policies:
- **Constant** - retry after a fixed duration
- **Exponential** - retry with exponentially increasing delays (recommended for most cases)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: retry-test-policy
  namespace: default
spec:
  policies:
    retries:
      exponentialRetry:
        policy: exponential
        maxRetries: 5
        duration: 100ms
        maxInterval: 8s
        matching:
          httpStatusCodes: "500,503"
      constantRetry:
        policy: constant
        maxRetries: 3
        duration: 500ms
  targets:
    apps:
      target-service:
        retry: exponentialRetry
```

## Build a Retry Counter Test Service

Track how many times your service is called to verify retry counts:

```python
from flask import Flask, jsonify
import time

app = Flask(__name__)
call_log = []

@app.route('/method/process', methods=['POST'])
def process():
    timestamp = time.time()
    call_log.append(timestamp)
    count = len(call_log)

    if count < 4:  # Fail first 3 calls
        print(f"Call {count}: returning 503")
        return jsonify({'error': 'transient failure'}), 503

    print(f"Call {count}: success")
    call_log.clear()
    return jsonify({'result': 'ok'})

@app.route('/calls', methods=['GET'])
def get_calls():
    return jsonify({'calls': len(call_log), 'timestamps': call_log})

app.run(port=8080)
```

## Verify Retry Timing

Run a request through Dapr and check the call log:

```bash
# Send request (Dapr will retry transparently)
time curl -X POST http://localhost:3500/v1.0/invoke/target-service/method/process \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'

# Check retry timing from the test service
curl http://localhost:8080/calls
```

Expected output shows timestamps with exponentially increasing gaps. Dapr calculates each interval as `PreviousBackOff * (random 0.5–1.5) * 1.5`, so starting from 100ms the gaps approximate 100ms, 150ms, 225ms — but with randomized jitter, the exact intervals vary between runs.

## Test Retry with Network-Level Failure

Use Toxiproxy to inject realistic connection resets:

```bash
# Create proxy for the target service
toxiproxy-cli create target-proxy \
  --listen 0.0.0.0:8081 \
  --upstream localhost:8080

# Inject connection resets for first 5 seconds
toxiproxy-cli toxic add target-proxy \
  -t reset_peer \
  -a timeout=1000 \
  --toxicity 0.7 \
  -n transient-reset

# Send a request - Dapr retries until success
curl -X POST http://localhost:3500/v1.0/invoke/target-service/method/process \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}' \
  --max-time 30
```

## Validate HTTP Status Code Matching

Confirm retries only fire for configured status codes:

```bash
# 500 should retry (configured)
curl -s http://localhost:3500/v1.0/invoke/target-service/method/error500
echo "Should retry: 5 attempts in logs"

# 400 should NOT retry (not configured)
curl -s http://localhost:3500/v1.0/invoke/target-service/method/error400
echo "Should not retry: single attempt in logs"
```

Check logs:

```bash
kubectl logs -l app=caller -c daprd | grep -E "retry|attempt|invoke"
```

## Test Retry with Real Infrastructure Failure

```bash
# Restart the target service deployment mid-request
kubectl rollout restart deployment/target-service

# Immediately send a request - it should retry during rollout
curl -X POST http://localhost:3500/v1.0/invoke/target-service/method/process \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
```

## Prometheus Retry Metrics

```bash
# Total retry attempts
dapr_resiliency_count{app_id="caller",name="exponentialRetry",flow_direction="outbound"}

# Successful retries
dapr_resiliency_count{app_id="caller",name="exponentialRetry",status="success"}
```

## Summary

Testing Dapr retry policies under real failures requires a call-counting test service to verify retry counts, timing logs to confirm exponential backoff intervals, and HTTP status code tests to validate matching configuration. Combining application-level failures, network-level faults via Toxiproxy, and infrastructure restarts provides comprehensive coverage of retry policy behavior.
