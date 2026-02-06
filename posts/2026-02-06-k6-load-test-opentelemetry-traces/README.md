# How to Correlate k6 Load Test Results with OpenTelemetry Traces for Performance Root Cause Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, k6, Load Testing, Performance, Distributed Tracing

Description: Learn how to connect k6 load test results with OpenTelemetry traces to pinpoint the exact root cause of performance bottlenecks.

When you run a load test with k6, you get aggregate numbers: p95 latency, error rates, throughput. These tell you something is slow, but not why. OpenTelemetry traces, on the other hand, show you the exact path a request takes through your system. Combining both gives you a powerful feedback loop where load tests reveal problems and traces explain them.

This post walks through setting up k6 with OpenTelemetry so that every virtual user request is linked to a distributed trace.

## Setting Up k6 with Trace Context Propagation

k6 supports custom HTTP headers, which means you can inject W3C Trace Context headers into every request. The trick is generating valid trace IDs and passing them along.

First, install k6 and the xk6-distributed-tracing extension:

```bash
# Build k6 with the OpenTelemetry output extension
xk6 build --with github.com/grafana/xk6-distributed-tracing

# Verify the build
./k6 version
```

Now write a k6 script that propagates trace context:

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import tracing from 'k6/experimental/tracing';

// Initialize the tracing instrumentation
tracing.instrumentHTTP({
  propagator: 'w3c',
});

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  // Every request now carries traceparent headers automatically
  const res = http.get('http://api.example.com/orders');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

## Configuring the OpenTelemetry Collector to Receive k6 Traces

k6 can export trace data directly to an OpenTelemetry Collector. Set up a collector config that receives from k6 and your application simultaneously:

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

  # Add an attribute to distinguish load test traffic
  attributes:
    actions:
      - key: test.source
        value: k6-load-test
        action: upsert

exporters:
  otlp:
    endpoint: your-backend:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [otlp]
```

Run k6 with the OTLP output:

```bash
# Point k6 trace output at the collector
K6_OTEL_GRPC_EXPORTER_INSECURE=true \
K6_OTEL_GRPC_EXPORTER_ENDPOINT=localhost:4317 \
./k6 run --out experimental-opentelemetry load-test.js
```

## Linking k6 Metrics to Specific Traces

The real value comes when you can go from "p95 latency spiked at 3:42pm" to the actual trace that was slow. Add custom tags to your k6 requests that match trace attributes:

```javascript
import http from 'k6/http';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export default function () {
  // Generate a correlation ID that appears in both k6 metrics and traces
  const correlationId = randomString(16);

  const params = {
    headers: {
      'X-Correlation-ID': correlationId,
    },
    tags: {
      correlation_id: correlationId,
      test_scenario: 'order-checkout',
    },
  };

  const res = http.post(
    'http://api.example.com/checkout',
    JSON.stringify({ items: [1, 2, 3] }),
    params
  );

  // Log slow requests so you can find their traces later
  if (res.timings.duration > 1000) {
    console.log(
      `Slow request: correlation_id=${correlationId} duration=${res.timings.duration}ms`
    );
  }
}
```

On the application side, extract that correlation ID and add it to your spans:

```python
# In your Flask/FastAPI handler
from opentelemetry import trace

@app.post("/checkout")
def checkout(request):
    span = trace.get_current_span()
    correlation_id = request.headers.get("X-Correlation-ID", "")
    span.set_attribute("k6.correlation_id", correlation_id)
    span.set_attribute("test.scenario", "order-checkout")

    # ... business logic
```

## Querying Traces from Failed Load Tests

After the load test finishes, use your trace backend to find the problematic requests. If you are using a tool like OneUptime or Jaeger, you can filter traces by attributes:

```bash
# Find all traces from the load test that took longer than 2 seconds
# Using the OneUptime API or any OTLP-compatible backend
curl -G "http://your-trace-backend/api/traces" \
  --data-urlencode "service=checkout-service" \
  --data-urlencode "tags=test.source:k6-load-test" \
  --data-urlencode "minDuration=2s" \
  --data-urlencode "start=$(date -d '1 hour ago' +%s)000000" \
  --data-urlencode "end=$(date +%s)000000"
```

## Automating the Correlation in CI

You can automate this whole flow in a CI pipeline. Run the load test, then query for slow traces and fail the build if certain patterns emerge:

```bash
#!/bin/bash
# run-load-test.sh

# Run k6 and capture the summary
./k6 run --out experimental-opentelemetry --out json=results.json load-test.js

# Check if p95 exceeded threshold
P95=$(jq '.metrics.http_req_duration.values["p(95)"]' results.json)
if (( $(echo "$P95 > 500" | bc -l) )); then
  echo "p95 exceeded 500ms ($P95 ms). Fetching slow traces..."

  # Query trace backend for slow spans during the test window
  curl -s "http://trace-backend/api/traces?service=checkout&minDuration=500ms" \
    | jq '.traces[].spans[] | {operation: .operationName, duration: .duration, db_statement: .tags["db.statement"]}'

  exit 1
fi
```

This gives you a direct path from "the load test failed" to "here is the slow database query causing it." No more guessing.

## Summary

Correlating k6 load tests with OpenTelemetry traces transforms load testing from a pass/fail exercise into a diagnostic tool. The key pieces are: propagate trace context from k6, tag requests with identifiers that appear in both systems, and query traces filtered by load test attributes when performance degrades. This approach works with any OpenTelemetry-compatible backend, so you are not locked into a specific vendor.
