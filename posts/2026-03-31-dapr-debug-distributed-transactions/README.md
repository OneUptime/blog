# How to Debug Distributed Transactions Using Dapr Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, Debugging, Transaction, Observability, Microservice

Description: Use Dapr distributed traces to debug failed or slow distributed transactions by following the trace timeline across multiple services and state stores.

---

## Overview

Distributed transactions in microservices - even eventual consistency patterns - can fail in subtle ways. A payment might succeed while inventory reservation fails, leaving the system in an inconsistent state. Dapr traces capture all service invocations, state operations, and pub/sub messages in a single trace, making it possible to reconstruct exactly what happened during a failed transaction.

## Setting Up Trace Data Collection

First, ensure your services are configured with tracing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: debug-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin.monitoring.svc.cluster.local:9411/api/v2/spans"
```

## Instrumenting Your Transaction Saga

For a saga pattern (e.g., order creation), log the trace ID at each step:

```python
from flask import Flask, request
import requests
import json

app = Flask(__name__)

DAPR_URL = "http://localhost:3500"

def get_trace_id():
    tp = request.headers.get('traceparent', '')
    parts = tp.split('-')
    return parts[1] if len(parts) >= 2 else 'none'

@app.route('/orders', methods=['POST'])
def create_order():
    trace_id = get_trace_id()
    data = request.json.get('data', {})
    order_id = data['orderId']

    print(json.dumps({"event": "saga_start", "trace_id": trace_id, "order_id": order_id}))

    # Step 1: Reserve inventory
    resp = requests.post(
        f"{DAPR_URL}/v1.0/invoke/inventory-service/method/reserve",
        json={"orderId": order_id, "items": data['items']},
        headers={"traceparent": request.headers.get("traceparent", "")}
    )
    if resp.status_code != 200:
        print(json.dumps({"event": "inventory_failed", "trace_id": trace_id}))
        return "inventory reservation failed", 500

    # Step 2: Process payment
    resp = requests.post(
        f"{DAPR_URL}/v1.0/invoke/payment-service/method/charge",
        json={"orderId": order_id, "amount": data['total']},
        headers={"traceparent": request.headers.get("traceparent", "")}
    )
    if resp.status_code != 200:
        print(json.dumps({"event": "payment_failed", "trace_id": trace_id}))
        # Compensate: release inventory
        requests.post(
            f"{DAPR_URL}/v1.0/invoke/inventory-service/method/release",
            json={"orderId": order_id},
            headers={"traceparent": request.headers.get("traceparent", "")}
        )
        return "payment failed", 500

    print(json.dumps({"event": "saga_complete", "trace_id": trace_id}))
    return "", 200
```

## Reading the Trace Timeline

When a transaction fails, find the trace in Zipkin:

```bash
# Find failed traces
curl "http://localhost:9411/api/v2/traces?serviceName=order-service&minDuration=0&annotationQuery=error"

# Get trace by ID
curl "http://localhost:9411/api/v2/trace/4bf92f3577b34da6a3ce929d0e0e4736"
```

The trace shows:
- Span 1: `order-service` receives HTTP POST
- Span 2: `order-service` calls `inventory-service` (300ms)
- Span 3: `inventory-service` writes to Redis state (50ms)
- Span 4: `order-service` calls `payment-service` (timeout at 5000ms)
- ERROR span with tag `error: connection refused`

## Identifying Common Failure Patterns

### Timeout Cascades

A slow downstream service causes timeouts to propagate:

```text
order-service (5100ms) [TIMEOUT]
  inventory-service (200ms) [OK]
  payment-service (5000ms) [TIMEOUT]
    external-bank-api (4999ms) [TIMEOUT]
```

Fix: Add circuit breakers and reduce timeouts at the Dapr level.

### Partial Failures

```text
order-service [ERROR]
  inventory-service [OK] - reserved
  payment-service [ERROR] - charged (but response lost!)
```

This indicates a network failure between payment-service response and order-service receipt. Fix: Use idempotency keys in payment requests.

## Adding Custom Span Attributes

```python
import opentelemetry.trace as trace

tracer = trace.get_tracer(__name__)

def process_payment(order_id, amount):
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("payment.amount", amount)
        # ... payment logic
```

## Debugging State Operations

Dapr traces include state store reads and writes. In the trace, look for spans named with patterns like:
- `CallLocal/<app-id>/<method>` - service-to-service invocations between Dapr sidecars
- `/v1.0/state/<store-name>` - state store reads and writes via the Dapr HTTP API

Slow state operations appear as long spans directly under the service span.

## Summary

Dapr traces capture the complete execution timeline of distributed transactions, including all service calls, state operations, and pub/sub messages. When a saga fails, retrieve the trace by ID from your tracing backend to see exactly which step failed, how long each step took, and what error occurred. Combine trace data with structured logs containing the same trace ID for a complete picture of distributed transaction failures.
