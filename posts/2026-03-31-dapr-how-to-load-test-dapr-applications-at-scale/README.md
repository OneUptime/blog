# How to Load Test Dapr Applications at Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Load Testing, Performance, k6, Locust, Microservice, Benchmarking

Description: Learn how to load test Dapr microservices using k6 and Locust, covering service invocation, pub/sub throughput, and state store performance benchmarking.

---

Load testing Dapr applications requires testing at multiple layers: the raw service throughput through the Dapr sidecar, pub/sub message processing rates, and state store read/write performance. A test that only hits your application's HTTP endpoint misses the overhead introduced by the Dapr sidecar, mTLS, and component serialization. This guide covers comprehensive load testing strategies for Dapr-based microservices.

## Load Testing Architecture

There are two approaches to load testing Dapr services:

```text
Option A: Test through the Dapr sidecar (realistic)
  Load Generator --> Dapr HTTP API (port 3500) --> App

Option B: Test the app directly (baseline comparison)
  Load Generator --> App HTTP port (e.g., 8080) --> App
```

Always test both to measure the Dapr sidecar overhead. The difference reveals the cost of mTLS, middleware, and Dapr's internal routing.

## Setting Up the Test Environment

```bash
# Install k6
brew install k6                     # macOS
# sudo apt install k6               # Ubuntu (add k6 repo first)

# Install Locust
pip install locust

# Create a dedicated test namespace in Kubernetes
kubectl create namespace load-test

# Deploy test applications with Dapr enabled
kubectl apply -f test-deployments.yaml -n load-test
```

The test application (go):

```go
// main.go - a simple order service optimized for load testing
package main

import (
    "encoding/json"
    "fmt"
    "math/rand"
    "net/http"
    "os"
    "strings"
)

type Order struct {
    OrderID    string  `json:"orderId"`
    CustomerID string  `json:"customerId"`
    Amount     float64 `json:"amount"`
}

var daprPort = os.Getenv("DAPR_HTTP_PORT")

func createOrderHandler(w http.ResponseWriter, r *http.Request) {
    var order Order
    json.NewDecoder(r.Body).Decode(&order)
    
    if order.OrderID == "" {
        order.OrderID = fmt.Sprintf("ord-%d", rand.Int63())
    }
    
    // Save state via Dapr
    stateURL := fmt.Sprintf("http://localhost:%s/v1.0/state/statestore", daprPort)
    stateBody, _ := json.Marshal([]map[string]interface{}{
        {"key": order.OrderID, "value": order},
    })
    
    resp, _ := http.Post(stateURL, "application/json",
        strings.NewReader(string(stateBody)))
    
    if resp != nil {
        resp.Body.Close()
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{
        "orderId": order.OrderID,
        "status":  "created",
    })
}

func main() {
    if daprPort == "" {
        daprPort = "3500"
    }
    
    http.HandleFunc("/orders", createOrderHandler)
    http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
        w.WriteHeader(http.StatusOK)
    })
    
    fmt.Println("Order service listening on :8080")
    http.ListenAndServe(":8080", nil)
}
```

## k6 Load Test Script for Service Invocation

```javascript
// load-tests/service-invocation.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderCreationTrend = new Trend('order_creation_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Ramp up to 50 VUs
    { duration: '3m', target: 50 },    // Sustain 50 VUs
    { duration: '1m', target: 200 },   // Spike to 200 VUs
    { duration: '2m', target: 200 },   // Sustain spike
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p99<2000'],  // 99th percentile < 2s
    'http_req_failed': ['rate<0.01'],   // Error rate < 1%
    'errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://order-service.load-test.svc.cluster.local:3500';

export default function () {
  const orderId = `ord-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  // Test via Dapr service invocation
  const startTime = Date.now();
  const response = http.post(
    `${BASE_URL}/v1.0/invoke/order-service/method/orders`,
    JSON.stringify({
      orderId: orderId,
      customerId: `cust-${Math.floor(Math.random() * 1000)}`,
      amount: parseFloat((Math.random() * 100).toFixed(2)),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '5s',
    }
  );
  
  orderCreationTrend.add(Date.now() - startTime);
  errorRate.add(response.status >= 400);

  const success = check(response, {
    'status is 201': (r) => r.status === 201,
    'has orderId': (r) => {
      try {
        return JSON.parse(r.body).orderId !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}
```

## k6 Script for State Store Benchmarking

```javascript
// load-tests/state-store-bench.js
import http from 'k6/http';
import { check, group } from 'k6';
import { Trend } from 'k6/metrics';

const writeTrend = new Trend('state_write_ms');
const readTrend = new Trend('state_read_ms');

export const options = {
  vus: 100,
  duration: '2m',
  thresholds: {
    'state_write_ms': ['p95<100'],   // 95th percentile write < 100ms
    'state_read_ms': ['p95<50'],     // 95th percentile read < 50ms
  },
};

const DAPR_URL = __ENV.DAPR_URL || 'http://localhost:3500';

export default function () {
  const key = `bench-key-${__VU}-${__ITER}`;
  const value = { data: 'x'.repeat(1024) }; // 1KB value

  group('State Write', () => {
    const start = Date.now();
    const resp = http.post(
      `${DAPR_URL}/v1.0/state/statestore`,
      JSON.stringify([{ key, value }]),
      { headers: { 'Content-Type': 'application/json' } }
    );
    writeTrend.add(Date.now() - start);
    check(resp, { 'write success': (r) => r.status === 204 });
  });

  group('State Read', () => {
    const start = Date.now();
    const resp = http.get(`${DAPR_URL}/v1.0/state/statestore/${key}`);
    readTrend.add(Date.now() - start);
    check(resp, { 'read success': (r) => r.status === 200 });
  });
}
```

## Locust Load Test for Pub/Sub Throughput

```python
# load-tests/pubsub_test.py
import json
import time
import uuid
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner

class DaprPubSubUser(HttpUser):
    wait_time = between(0.1, 0.5)
    host = "http://localhost:3500"

    @task(3)
    def publish_order(self):
        order_id = str(uuid.uuid4())[:8]
        payload = {
            "orderId": order_id,
            "customerId": f"cust-{self.environment.runner.user_count % 100}",
            "amount": round(10 + self.environment.runner.user_count * 0.5, 2)
        }
        
        with self.client.post(
            "/v1.0/publish/pubsub/orders",
            json=payload,
            catch_response=True
        ) as response:
            if response.status_code in (200, 204):
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @task(1)
    def get_order_state(self):
        order_id = f"ord-{self.environment.runner.user_count % 50}"
        self.client.get(f"/v1.0/state/statestore/{order_id}")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print(f"\nFinal stats:")
    print(f"  Total requests: {environment.stats.total.num_requests}")
    print(f"  Failures: {environment.stats.total.num_failures}")
    print(f"  RPS: {environment.stats.total.current_rps:.1f}")
    print(f"  p99 latency: {environment.stats.total.get_response_time_percentile(0.99):.1f}ms")
```

## Running and Analyzing Results

```bash
# Run k6 service invocation test
k6 run --vus 100 --duration 5m \
  -e BASE_URL=http://dapr-sidecar:3500 \
  load-tests/service-invocation.js

# Run Locust pub/sub test
locust -f load-tests/pubsub_test.py \
  --headless \
  --users 200 \
  --spawn-rate 10 \
  --run-time 5m \
  --host http://dapr-sidecar:3500 \
  --csv results/pubsub

# Analyze k6 results with InfluxDB + Grafana
k6 run --out influxdb=http://influxdb:8086/k6 \
  load-tests/state-store-bench.js
```

## Summary

Effective Dapr load testing requires exercising all layers: service invocation latency through the sidecar, state store throughput with read/write separation, and pub/sub message processing rates. Use k6 for scripted API load tests with ramp-up/sustain/spike patterns, and Locust for behavior-based simulation of multiple user types. Always compare test results with and without the Dapr sidecar to understand the overhead budget, and use the p95/p99 latency thresholds as acceptance criteria that prevent performance regressions from being deployed to production.
