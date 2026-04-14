# How to Implement Synchronous Request-Reply with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Request-Reply, Service Invocation, Synchronous, HTTP, gRPC

Description: Implement synchronous request-reply communication between Dapr microservices using service invocation for direct, low-latency inter-service calls.

---

## Overview

While Dapr's pub/sub building block handles asynchronous messaging, many use cases require synchronous request-reply communication - querying a service for immediate data, or performing an action that needs an immediate confirmation. Dapr's service invocation building block provides service discovery, load balancing, and observability for synchronous inter-service calls.

## Service Invocation Architecture

```text
Client Service --> Dapr Sidecar --> Dapr Sidecar --> Target Service
(Port 3500)                                          (Port 8080)
```

Dapr handles service discovery via mDNS (local) or Kubernetes DNS (K8s), eliminating the need for manual endpoint configuration.

## Invoking a Service

```javascript
const { DaprClient, HttpMethod } = require('@dapr/dapr');

const client = new DaprClient();

async function getOrderDetails(orderId) {
  try {
    const response = await client.invoker.invoke(
      'order-service',           // Target app ID
      `orders/${orderId}`,        // Method path
      HttpMethod.GET              // HTTP method
    );
    return response;
  } catch (error) {
    console.error(`Failed to get order ${orderId}:`, error.message);
    throw error;
  }
}

async function createOrder(orderData) {
  const response = await client.invoker.invoke(
    'order-service',
    'orders',
    HttpMethod.POST,
    orderData
  );
  return response;
}

// Usage
const order = await getOrderDetails('ord-123');
console.log('Order:', order);
```

## Implementing the Called Service

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

# In-memory order store for example
orders = {}

@app.route('/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    order = orders.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order), 200

@app.route('/orders', methods=['POST'])
def create_order():
    order_data = request.json
    order_id = generate_id()
    order = {
        "orderId": order_id,
        "customerId": order_data["customerId"],
        "items": order_data["items"],
        "total": order_data["total"],
        "status": "pending"
    }
    orders[order_id] = order
    return jsonify(order), 201

def generate_id():
    import uuid
    return str(uuid.uuid4())[:8]

if __name__ == '__main__':
    app.run(port=8080)
```

## Timeout and Retry Configuration

Configure service invocation timeouts in Dapr's resiliency policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-service-resiliency
spec:
  policies:
    timeouts:
      orderServiceTimeout: 5s
    retries:
      orderServiceRetry:
        policy: exponential
        maxInterval: 30s
        maxRetries: 3
    circuitBreakers:
      orderServiceCB:
        maxRequests: 1
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 5

  targets:
    apps:
      order-service:
        timeout: orderServiceTimeout
        retry: orderServiceRetry
        circuitBreaker: orderServiceCB
```

## gRPC Service Invocation

For performance-critical synchronous calls, use gRPC:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"

    dapr "github.com/dapr/go-sdk/client"
)

func getInventoryLevel(productId string) (int, error) {
    client, err := dapr.NewClient()
    if err != nil {
        return 0, err
    }
    defer client.Close()

    content := &dapr.DataContent{
        ContentType: "application/json",
        Data:        []byte(fmt.Sprintf(`{"productId":"%s"}`, productId)),
    }

    resp, err := client.InvokeMethodWithContent(
        context.Background(),
        "inventory-service",
        "getLevel",
        "POST",
        content,
    )
    if err != nil {
        return 0, fmt.Errorf("failed to invoke inventory service: %w", err)
    }

    var result map[string]interface{}
    json.Unmarshal(resp, &result)
    return int(result["quantity"].(float64)), nil
}
```

## Request-Reply Over Pub/Sub (Async Bridge)

For services that only support events, implement request-reply over pub/sub:

```python
import dapr.clients as dapr
import json
import uuid
import time

def request_reply_over_pubsub(request_topic: str, reply_topic: str,
                               payload: dict, timeout: int = 30) -> dict:
    """Synchronous request-reply bridge over pub/sub"""
    correlation_id = str(uuid.uuid4())

    with dapr.DaprClient() as client:
        # Save expected reply key
        client.save_state(
            "statestore",
            f"reply:{correlation_id}",
            json.dumps({"waiting": True}),
            state_metadata={"ttlInSeconds": str(timeout + 5)}
        )

        # Publish request with correlation ID
        payload["correlationId"] = correlation_id
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name=request_topic,
            data=json.dumps(payload)
        )

        # Poll for reply
        deadline = time.time() + timeout
        while time.time() < deadline:
            reply = client.get_state("statestore", f"reply:{correlation_id}")
            if reply.data:
                data = json.loads(reply.data)
                if not data.get("waiting"):
                    return data
            time.sleep(0.5)

        raise TimeoutError(f"No reply received within {timeout}s")
```

## Summary

Dapr service invocation provides synchronous request-reply with built-in service discovery, distributed tracing, and resiliency policies. Resiliency configurations with timeouts, retries, and circuit breakers prevent cascading failures when a service becomes slow or unavailable. For cases where only pub/sub is available, the correlation-ID pattern over pub/sub bridges asynchronous messaging to synchronous request-reply semantics at the cost of added latency.
