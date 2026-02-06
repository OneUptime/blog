# How to Use k6 with OpenTelemetry Output for Load Testing with Distributed Trace Correlation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, k6, Load Testing, Distributed Tracing, Performance

Description: Set up k6 load testing with OpenTelemetry output to correlate load test results with distributed traces for deep performance analysis.

k6 is a popular load testing tool, and starting with its experimental OpenTelemetry output, you can send k6 metrics directly to an OpenTelemetry Collector. Even more powerful, you can propagate trace context from k6 into your backend so that every load test request shows up as a distributed trace. This means you can drill down from "P95 latency spiked at 500 virtual users" to the exact trace showing what happened inside your application during that spike.

## Enabling OpenTelemetry Output in k6

k6 has a built-in experimental OpenTelemetry output. Enable it by setting environment variables:

```bash
# Run k6 with OTel output enabled
K6_OTEL_GRPC_EXPORTER_INSECURE=true \
K6_OTEL_METRIC_PREFIX=k6_ \
K6_OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4317 \
k6 run --out experimental-opentelemetry load-test.js
```

## Writing a Load Test with Trace Propagation

The key trick is to inject W3C Trace Context headers into your k6 requests so the backend creates traces linked to each k6 request:

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Generate a random hex string for trace IDs
function randomHex(length) {
  let result = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up to 50 users
    { duration: '3m', target: 50 },   // stay at 50 users
    { duration: '1m', target: 200 },  // ramp up to 200 users
    { duration: '3m', target: 200 },  // stay at 200 users
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Generate a unique trace ID for this request
  const traceId = randomHex(32);
  const spanId = randomHex(16);
  const traceparent = `00-${traceId}-${spanId}-01`;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // W3C Trace Context header links this request to the backend trace
      'traceparent': traceparent,
      // Tag the request as coming from k6 for easy filtering
      'x-load-test': 'true',
      'x-k6-scenario': __ENV.K6_SCENARIO || 'default',
    },
    tags: {
      trace_id: traceId, // tag k6 metrics with the trace ID
    },
  };

  // Simulate a realistic user flow
  const productId = randomIntBetween(1, 100);

  // Step 1: Browse products
  let res = http.get(`${__ENV.BASE_URL}/api/products`, params);
  check(res, { 'products list 200': (r) => r.status === 200 });

  sleep(randomIntBetween(1, 3));

  // Step 2: View a specific product
  res = http.get(`${__ENV.BASE_URL}/api/products/${productId}`, params);
  check(res, { 'product detail 200': (r) => r.status === 200 });

  sleep(randomIntBetween(1, 2));

  // Step 3: Add to cart
  res = http.post(`${__ENV.BASE_URL}/api/cart`, JSON.stringify({
    productId: productId,
    quantity: 1,
  }), params);
  check(res, { 'add to cart 200': (r) => r.status === 200 });

  sleep(randomIntBetween(2, 5));
}
```

## Collector Configuration for k6 Metrics

Configure the OpenTelemetry Collector to receive k6 metrics and route them alongside your application traces:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024
  # Add k6 test metadata to all metrics
  attributes:
    actions:
      - key: test.framework
        value: k6
        action: upsert

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  otlp/tempo:
    endpoint: "tempo:4317"
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [prometheus]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
```

## Querying Correlated Data

After the load test finishes, you can query for traces generated during the test window and correlate them with k6 metrics:

```python
# analyze_load_test.py
import requests
from datetime import datetime, timedelta

TEMPO_URL = "http://localhost:3200"
PROMETHEUS_URL = "http://localhost:9090"

def find_slow_traces(start_time, end_time, min_duration_ms=500):
    """Find traces from the load test that exceeded the latency threshold."""
    query = f'{{resource.service.name="my-api" && span.http.request.header.x_load_test="true" && duration>{min_duration_ms}ms}}'
    resp = requests.get(f"{TEMPO_URL}/api/search", params={
        "q": query,
        "start": int(start_time.timestamp()),
        "end": int(end_time.timestamp()),
        "limit": 50,
    })
    return resp.json().get("traces", [])

def get_k6_metrics_at_time(timestamp):
    """Get the k6 virtual user count and request rate at a specific time."""
    queries = {
        "vus": f'k6_vus{{timestamp="{timestamp}"}}',
        "req_rate": f'rate(k6_http_reqs_total[1m])',
        "p95": f'k6_http_req_duration{{quantile="0.95"}}',
    }
    results = {}
    for name, query in queries.items():
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query",
                          params={"query": query, "time": timestamp})
        data = resp.json().get("data", {}).get("result", [])
        if data:
            results[name] = float(data[0]["value"][1])
    return results

# Find slow traces during the load test window
end = datetime.utcnow()
start = end - timedelta(minutes=10)
slow_traces = find_slow_traces(start, end)

for t in slow_traces:
    print(f"Trace {t['traceID']}: duration={t['durationMs']}ms")
    # You can now open each trace in your trace viewer (Jaeger, Grafana Tempo)
    # to see exactly which span was slow during the load test
```

## What to Look For

During load test analysis, focus on these patterns:

1. **Linear latency increase with VU count** usually means a resource bottleneck like database connection pool exhaustion.
2. **Sudden latency spike at a specific VU count** often indicates a hard limit being hit, such as max threads or file descriptors.
3. **Slow spans that only appear under load** point to contention issues like lock contention or connection queuing.

The distributed traces give you the span-level breakdown that k6 summary statistics cannot. Instead of just knowing "P95 went to 2 seconds at 200 VUs," you can see that the `db.query` span went from 20ms to 1.8 seconds, pointing directly to the database as the bottleneck.

## Wrapping Up

k6 with OpenTelemetry output is a powerful combination for load testing. The metrics give you the high-level view of how your system performs under load, and the distributed traces give you the detailed breakdown of what happened inside your application during those same requests. Together, they turn load testing from a pass/fail exercise into a deep performance investigation tool.
