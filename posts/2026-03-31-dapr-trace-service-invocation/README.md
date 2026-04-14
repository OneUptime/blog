# How to Trace Service Invocation Calls in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, Service Invocation, Observability, Microservice, Performance

Description: Monitor and analyze Dapr service-to-service invocation calls using distributed traces to identify latency bottlenecks and failure patterns.

---

## Overview

Service invocation is one of Dapr's most-used building blocks. Every `v1.0/invoke` call creates two trace spans: one on the calling service's sidecar and one on the receiving service's sidecar. This gives you precise timing for network transit and application processing separately, making it easy to distinguish slow network from slow application code.

## How Dapr Instruments Service Invocation

For a call from Service A to Service B:

1. Service A sends HTTP POST to its Dapr sidecar
2. Dapr sidecar A creates span `DaprServiceInvocation` (caller side)
3. Dapr sidecar A adds `traceparent` to the request
4. Dapr sidecar B receives the request, creates child span (receiver side)
5. Dapr sidecar B forwards to Service B application
6. Spans are exported with parent-child relationship intact

## Service Invocation Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: invocation-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

## Calling Service Implementation

```python
from flask import Flask, request
import requests

app = Flask(__name__)
DAPR_URL = "http://localhost:3500"

@app.route('/process-order', methods=['POST'])
def process_order():
    data = request.json.get('data', {})

    # Service invocation - creates a trace span
    resp = requests.post(
        f"{DAPR_URL}/v1.0/invoke/inventory-service/method/reserve",
        json={"orderId": data['orderId'], "items": data['items']},
        headers={
            "Content-Type": "application/json",
            "traceparent": request.headers.get("traceparent", "")
        },
        timeout=5
    )

    if resp.status_code != 200:
        return {"error": "reservation failed"}, 502

    return {"status": "reserved"}, 200
```

## Target Service Implementation

```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/reserve', methods=['POST'])
def reserve():
    data = request.json
    order_id = data['orderId']

    # Application processing time appears as span duration
    result = reserve_inventory(data['items'])

    if not result['success']:
        return {"error": result['message']}, 409

    return {"reserved": True}, 200
```

## Span Attributes for Service Invocation

Dapr service invocation spans include:

| Attribute | Example Value |
|---|---|
| `http.method` | `POST` |
| `http.url` | `/reserve` |
| `http.status_code` | `200` |
| `net.peer.name` | `inventory-service` |
| `dapr.api.protocol` | `http` |

## Querying Service Invocation Spans

```bash
# Find all calls to inventory-service
curl "http://localhost:16686/api/traces?service=order-service&tags=net.peer.name:inventory-service"

# Find slow invocations (>200ms)
curl "http://localhost:16686/api/traces?service=order-service&minDuration=200000"

# Find failed invocations
curl "http://localhost:16686/api/traces?service=order-service&tags=http.status_code:500"
```

## Analyzing Latency Breakdown

In a service invocation trace, you can measure:

- **Caller span duration** = total time from caller's perspective (includes network + app)
- **Receiver span duration** = time on receiving service (app processing only)
- **Network overhead** = caller duration - receiver duration

```python
# Pseudocode to extract network latency from trace
def calculate_network_latency(trace):
    caller_span = find_span(trace, service="order-service", tag="invocation")
    receiver_span = find_span(trace, service="inventory-service", tag="server")

    caller_duration_ms = caller_span.duration / 1000
    receiver_duration_ms = receiver_span.duration / 1000

    network_ms = caller_duration_ms - receiver_duration_ms
    print(f"Network overhead: {network_ms:.2f}ms")
```

## Retry Tracing

When Dapr retries a failed invocation, each retry creates a new span:

```yaml
# Retry policy in resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-resiliency
spec:
  policies:
    retries:
      order-retry:
        policy: exponential
        maxRetries: 3
        maxInterval: 10s
```

Traces show three spans for a service that failed twice and succeeded on the third attempt.

## Summary

Dapr creates paired trace spans for every service invocation: one on the caller sidecar and one on the receiver sidecar. This dual-span model lets you precisely measure network transit time versus application processing time. Use minimum duration filters in your trace backend to find slow invocations, and examine HTTP status code attributes to identify error patterns between specific service pairs.
