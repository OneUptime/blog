# How to Use CloudEvents Spec with Dapr for Interoperability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CloudEvent, Pub/Sub, Interoperability, Standard, CNCF

Description: Use the CloudEvents specification with Dapr pub/sub for standardized event format interoperability across services, languages, and platforms.

---

## Overview

CloudEvents is a CNCF specification for describing event data in a common way. Dapr wraps all pub/sub messages in CloudEvents format by default, enabling interoperability between services written in different languages and frameworks, and with external systems that consume CloudEvents-formatted messages.

## CloudEvents Structure in Dapr

When Dapr publishes a message, it wraps it in a CloudEvents envelope:

```json
{
  "specversion": "1.0",
  "id": "a7e8e2b5-4f6d-4c8a-9e3c-d5a1f8c2b934",
  "source": "order-service",
  "type": "com.company.orders.orderplaced",
  "datacontenttype": "application/json",
  "time": "2026-03-31T10:00:00Z",
  "topic": "OrderPlaced",
  "pubsubname": "orders-pubsub",
  "traceid": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "data": {
    "orderId": "ord-001",
    "customerId": "cust-123",
    "total": 99.99
  }
}
```

## Publishing with Custom CloudEvents Attributes

```python
import dapr.clients as dapr
import json

def publish_order_cloudevent(order: dict):
    with dapr.DaprClient() as client:
        # Dapr automatically wraps in CloudEvents format
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="OrderPlaced",
            data=json.dumps(order),
            data_content_type="application/json",
            publish_metadata={
                # CloudEvents extensions
                "cloudevent.type": "com.company.orders.orderplaced",
                "cloudevent.source": "/services/order-service",
                "cloudevent.subject": f"order/{order['orderId']}",
                # Custom CloudEvents extension attributes
                "cloudevent.correlationid": order.get("correlationId", ""),
                "cloudevent.tenantid": order.get("tenantId", "default")
            }
        )
```

## Handling CloudEvents in Subscribers

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Dapr sends the full CloudEvents envelope
app.post('/orders/placed', (req, res) => {
  const cloudEvent = req.body;

  // Standard CloudEvents attributes
  const eventId = cloudEvent.id;
  const eventType = cloudEvent.type;
  const source = cloudEvent.source;
  const eventTime = cloudEvent.time;
  const traceId = cloudEvent.traceid;

  // Your actual event data
  const orderData = cloudEvent.data;

  console.log(`Received CloudEvent: ${eventType}`);
  console.log(`  Event ID: ${eventId}`);
  console.log(`  Source: ${source}`);
  console.log(`  Order: ${orderData.orderId}`);

  // Process the order
  processOrder(orderData);

  res.status(200).json({ status: 'SUCCESS' });
});

function processOrder(order) {
  console.log(`Processing order ${order.orderId} for $${order.total}`);
}

app.listen(8080);
```

## Raw CloudEvents (Bypassing Dapr Wrapping)

When consuming from external CloudEvents producers, disable Dapr's wrapping:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: external-events-subscription
spec:
  pubsubname: orders-pubsub
  topic: external-orders
  route: /external/orders
  metadata:
    isRawPayload: "true"
```

Handle the raw CloudEvents envelope directly:

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/external/orders', methods=['POST'])
def handle_external_event():
    # Raw CloudEvents format from external system
    cloud_event = request.json

    # Parse standard fields
    event_type = cloud_event.get("type")
    source = cloud_event.get("source")
    data = cloud_event.get("data", {})

    print(f"Received external CloudEvent: type={event_type}, source={source}")
    process_external_order(data)

    return jsonify({"status": "SUCCESS"}), 200
```

## CloudEvents with Knative Eventing

Dapr CloudEvents format is compatible with Knative Eventing for Kubernetes:

```yaml
# Knative Trigger consuming Dapr events
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-placed-trigger
spec:
  broker: default
  filter:
    attributes:
      type: com.company.orders.orderplaced
      source: /services/order-service
  subscriber:
    ref:
      apiVersion: v1
      kind: Service
      name: notification-service
```

## CloudEvents Validation

Validate incoming CloudEvents in your handler:

```python
def validate_cloudevent(event: dict) -> bool:
    required_fields = ["specversion", "id", "source", "type"]
    for field in required_fields:
        if field not in event:
            print(f"Missing required CloudEvents field: {field}")
            return False
    if event["specversion"] != "1.0":
        print(f"Unsupported CloudEvents version: {event['specversion']}")
        return False
    return True
```

## Summary

CloudEvents with Dapr enables standardized event format interoperability across polyglot microservices and external systems. Dapr's automatic CloudEvents wrapping provides distributed tracing context, event metadata, and source attribution without any application code changes. For external CloudEvents producers (Knative, Azure Event Grid, etc.), the `rawPayload` subscription metadata disables Dapr's double-wrapping, enabling seamless integration.
