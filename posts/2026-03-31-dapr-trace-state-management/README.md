# How to Trace State Management Operations in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, State Management, Observability, Redis, Microservice

Description: Use Dapr distributed traces to monitor state store read and write performance, identify slow queries, and debug state management issues.

---

## Overview

Every Dapr state management operation (get, set, delete, bulk operations, transactions) generates a trace span. These spans show exactly how long state operations take, which state store was used, and which keys were accessed. Tracing state operations helps identify slow queries, unexpected cache misses, and transaction conflicts.

## Prerequisites

- Dapr with tracing configured
- A state store component (Redis, Cosmos DB, etc.)
- Jaeger or another trace backend

## Example State Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-state
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.default.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

## Application with State Operations

```python
from flask import Flask, request
import requests
import json

app = Flask(__name__)
DAPR_URL = "http://localhost:3500"

@app.route('/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    # GET state - Dapr creates a span named after the HTTP path
    resp = requests.get(
        f"{DAPR_URL}/v1.0/state/redis-state/{order_id}",
        headers={"traceparent": request.headers.get("traceparent", "")}
    )

    if resp.status_code == 204:
        return {"error": "not found"}, 404

    return resp.json(), 200

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.json
    order_id = data['orderId']

    # SET state - Dapr creates a span named after the HTTP path
    requests.post(
        f"{DAPR_URL}/v1.0/state/redis-state",
        json=[{"key": order_id, "value": data}],
        headers={"traceparent": request.headers.get("traceparent", "")}
    )

    return '', 201

@app.route('/orders/bulk', methods=['POST'])
def get_orders_bulk():
    order_ids = request.json['orderIds']

    # BULK GET - single span for all keys
    resp = requests.post(
        f"{DAPR_URL}/v1.0/state/redis-state/bulk",
        json={"keys": order_ids},
        headers={"traceparent": request.headers.get("traceparent", "")}
    )

    return resp.json(), 200
```

## Transactional State Operations

Dapr's transactional state creates a single span wrapping all operations:

```python
def update_order_and_inventory(order_id, item_id):
    # Single span for the transaction request
    requests.post(
        f"{DAPR_URL}/v1.0/state/redis-state/transaction",
        json={
            "operations": [
                {
                    "operation": "upsert",
                    "request": {
                        "key": f"order:{order_id}",
                        "value": {"status": "confirmed"}
                    }
                },
                {
                    "operation": "upsert",
                    "request": {
                        "key": f"inventory:{item_id}",
                        "value": {"reserved": True}
                    }
                }
            ]
        },
        headers={"traceparent": request.headers.get("traceparent", "")}
    )
```

## Reading State Traces in Jaeger

State operation spans have these attributes:

| Attribute | Value |
|---|---|
| `db.system` | `state` |
| `db.statement` | HTTP method and path (e.g., `GET /v1.0/state/redis-state/order123`) |
| `db.name` | state store name (e.g., `redis-state`) |

Search for slow state operations:

```bash
curl "http://localhost:16686/api/traces?service=order-service&minDuration=100ms"
```

## Identifying N+1 State Patterns

In a trace, N+1 state lookups appear as many sequential small spans:

```text
GET /cart (200ms)
  GET cart:user-1 (5ms)
  GET product:item-1 (5ms)
  GET product:item-2 (5ms)
  GET product:item-3 (5ms)
  ... (20 more)
```

Replace with bulk get:

```python
# Instead of N individual gets
product_ids = [item['productId'] for item in cart_items]
resp = requests.post(
    f"{DAPR_URL}/v1.0/state/redis-state/bulk",
    json={"keys": product_ids}
)
```

The trace collapses to a single bulk state span.

## State Store Latency Alerting

Using the OTel Collector's spanmetrics connector, derive latency metrics from state operation spans:

```yaml
connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [1ms, 5ms, 10ms, 50ms, 100ms, 500ms]
    dimensions:
      - name: db.system
      - name: service.name
```

Alert when state latency exceeds your SLO.

## Summary

Dapr generates trace spans for every state management operation including get, set, delete, bulk, and transactions. These spans reveal state store latency, key access patterns, and N+1 query issues. Use trace data to identify slow state operations, spot unexpected sequential lookups that should be batched, and verify that transactional operations execute atomically within a single trace span.
