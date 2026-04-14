# How to Conduct Dapr Load Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Load Testing, Performance, k6, Benchmark

Description: Learn how to conduct load testing for Dapr applications using k6 and hey to validate throughput, latency, and stability under sustained traffic.

---

## Overview

Load testing Dapr applications verifies that the sidecar, components, and application code perform acceptably under production-level traffic. A thorough load test exercises service invocation, pub/sub publishing, and state operations simultaneously.

## Choosing a Load Testing Tool

| Tool | Best For | Notes |
|---|---|---|
| k6 | Scripted scenarios, ramp patterns | JavaScript-based |
| hey | Simple HTTP benchmarks | Fast, single-command |
| wrk | Raw throughput measurement | Lua scripting |
| Locust | Realistic user simulation | Python-based |
| Vegeta | Precise rate-controlled tests | Go-based |

## Load Testing Service Invocation with k6

```javascript
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Sustain 50 users
        { duration: '2m', target: 200 },  // Spike to 200 users
        { duration: '5m', target: 200 },  // Sustain spike
        { duration: '2m', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(99)<500'],  // P99 must be under 500ms
        http_req_failed: ['rate<0.01'],    // Error rate under 1%
    },
};

export default function () {
    const payload = JSON.stringify({
        orderId: `order-${__ITER}`,
        amount: Math.random() * 100
    });

    const res = http.post(
        'http://localhost:3500/v1.0/invoke/order-service/method/process',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 200ms': (r) => r.timings.duration < 200,
    });

    sleep(0.1);
}
```

Run the test:

```bash
k6 run load-test.js
```

## Load Testing Pub/Sub Publishing

```javascript
import http from 'k6/http';

export const options = {
    vus: 100,
    duration: '5m',
};

export default function () {
    const event = JSON.stringify({
        eventType: 'order.created',
        orderId: `ord-${Date.now()}`,
        ts: new Date().toISOString()
    });

    http.post(
        'http://localhost:3500/v1.0/publish/pubsub/orders',
        event,
        { headers: { 'Content-Type': 'application/json' } }
    );
}
```

## Load Testing State Operations

```bash
# Sequential writes with hey
hey -n 50000 -c 100 \
  -m POST \
  -H "Content-Type: application/json" \
  -d '[{"key": "load-test-key", "value": "test-data"}]' \
  -o csv \
  "http://localhost:3500/v1.0/state/statestore" > state-write-results.csv

# Analyze results
python3 -c "
import csv, statistics
with open('state-write-results.csv') as f:
    reader = csv.reader(f)
    next(reader)  # Skip header row
    times = [float(row[0])*1000 for row in reader if row]
print(f'P50: {statistics.median(times):.2f}ms')
print(f'P99: {statistics.quantiles(times, n=100)[98]:.2f}ms')
"
```

## Validating System Stability Under Load

Monitor for memory leaks during long-running tests:

```bash
# Run for 30 minutes and watch memory
watch -n30 "kubectl top pods -l app=order-service --containers | grep daprd"
```

## Summary

Effective Dapr load testing requires realistic traffic scenarios that combine service invocation, pub/sub, and state operations simultaneously. Use k6 for scripted ramp-up patterns with built-in thresholds, monitor sidecar resources during the test, and look for latency percentile degradation and memory growth over extended test durations.
