# How to Subscribe to a Dapr Topic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Messaging, Kubernetes, Microservice

Description: Implement Dapr topic subscriptions using declarative YAML, programmatic subscriptions, and handle messages reliably with retry and dead-letter support.

---

## How Dapr Subscriptions Work

When a message is published to a Dapr topic, the Dapr sidecar delivers it to your application via HTTP POST. Your application exposes an endpoint that Dapr calls for each message. Dapr handles retries if your endpoint returns an error.

There are two ways to define subscriptions:
1. **Declarative** - YAML `Subscription` resource applied to Kubernetes
2. **Programmatic** - your app exposes a `/dapr/subscribe` endpoint at startup

## Declarative Subscription

Create a `Subscription` custom resource:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-subscription
  namespace: default
spec:
  topic: orders
  routes:
    default: /orders/received
  pubsubname: pubsub
scopes:
  - order-processor
```

Apply:

```bash
kubectl apply -f subscription.yaml
```

This tells Dapr to deliver messages from the `orders` topic to the `order-processor` app at the `/orders/received` endpoint.

## Handling Messages in Python (FastAPI)

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import json

app = FastAPI()

@app.post("/orders/received")
async def receive_order(request: Request):
    body = await request.json()
    
    # Dapr wraps the message in a CloudEvent envelope
    order_data = body.get("data", {})
    
    print(f"Received order: {order_data}")
    
    try:
        # Process the order
        process_order(order_data)
        
        # Return 200 to acknowledge the message
        return {"status": "SUCCESS"}
    except Exception as e:
        print(f"Error processing order: {e}")
        # Return RETRY to have Dapr retry delivery
        return JSONResponse(
            status_code=200,
            content={"status": "RETRY"}
        )

def process_order(order):
    print(f"Processing order {order.get('orderId')}")
```

## Message Status Responses

Dapr checks your HTTP response to determine what to do next:

| Response | Action |
|----------|--------|
| `{"status": "SUCCESS"}` or 200 | Message acknowledged, removed from queue |
| `{"status": "RETRY"}` | Dapr retries delivery |
| `{"status": "DROP"}` | Message dropped, warning logged |
| 5xx error | Dapr retries delivery |

## Programmatic Subscription

Instead of YAML, your app can declare subscriptions dynamically:

```python
from flask import Flask, jsonify, request
import json

app = Flask(__name__)

# Dapr calls this endpoint at startup to get subscriptions
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [
        {
            'pubsubname': 'pubsub',
            'topic': 'orders',
            'routes': {
                'default': '/orders/received'
            }
        },
        {
            'pubsubname': 'pubsub',
            'topic': 'payments',
            'routes': {
                'default': '/payments/received'
            }
        }
    ]
    return jsonify(subscriptions)

@app.route('/orders/received', methods=['POST'])
def receive_order():
    data = request.get_json()
    order = data.get('data', {})
    print(f"Received: {order}")
    return jsonify({"status": "SUCCESS"})

@app.route('/payments/received', methods=['POST'])
def receive_payment():
    data = request.get_json()
    payment = data.get('data', {})
    print(f"Payment received: {payment}")
    return jsonify({"status": "SUCCESS"})
```

## Using the Dapr Python SDK

```python
from dapr.ext.grpc import App
from dapr.ext.grpc._response import TopicEventResponse
import json

app = App()

@app.subscribe(pubsub_name='pubsub', topic='orders')
def order_subscriber(event) -> TopicEventResponse:
    data = json.loads(event.Data())
    print(f"Received order: {data}")
    return TopicEventResponse('success')
```

## Routing Messages Based on Content

Use routing rules to send messages to different endpoints based on content:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-routing-subscription
spec:
  topic: orders
  pubsubname: pubsub
  routes:
    rules:
      - match: event.type == "com.example.orders.express"
        path: /orders/express
      - match: event.type == "com.example.orders.standard"
        path: /orders/standard
    default: /orders/received
```

## Testing Subscriptions Locally

You can test your subscriber by sending a CloudEvent directly:

```bash
curl -X POST http://localhost:<your-app-port>/orders/received \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "com.example.order",
    "source": "test",
    "id": "test-1",
    "datacontenttype": "application/json",
    "data": {"orderId": "999", "item": "test"}
  }'
```

## Summary

Dapr topic subscriptions can be declared via YAML `Subscription` resources or programmatically via the `/dapr/subscribe` endpoint. Your application receives messages as HTTP POST requests to your defined routes, wrapped in CloudEvent envelopes. Return `{"status": "SUCCESS"}` to acknowledge, `RETRY` for transient failures, or `DROP` to discard problematic messages (a warning is logged). Routing rules allow content-based message routing to different handlers within the same application.
