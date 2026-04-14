# How to Use CloudEvents with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CloudEvent, Pub/Sub, Messaging, Microservice

Description: Learn how Dapr wraps pub/sub messages in CloudEvents format, access CloudEvent attributes, and publish custom CloudEvent-formatted messages.

---

## What Are CloudEvents

CloudEvents is a CNCF specification for describing events in a common format. Dapr wraps all pub/sub messages in CloudEvents envelopes by default, providing:

- Standard metadata (event type, source, time, ID)
- Content type information
- Extensibility with custom attributes
- Interoperability with other CloudEvents-aware systems

## The CloudEvent Envelope

When you publish a message through Dapr, subscribers receive it wrapped in a CloudEvent:

Published data:
```json
{"orderId": "123", "item": "book"}
```

Received CloudEvent:
```json
{
  "specversion": "1.0",
  "type": "com.dapr.event.sent",
  "source": "Dapr",
  "id": "a4d4b6f3-2c8e-4f5a-9c1d-7b9e8a3f2d1c",
  "time": "2026-03-31T10:00:00Z",
  "datacontenttype": "application/json",
  "pubsubname": "pubsub",
  "topic": "orders",
  "traceid": "00-abc123-def456-01",
  "data": {
    "orderId": "123",
    "item": "book"
  }
}
```

## Accessing CloudEvent Attributes in Subscribers

In Python:

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/orders/received")
async def receive_order(request: Request):
    body = await request.json()
    
    # CloudEvent metadata
    event_id = body.get("id")
    event_type = body.get("type")
    event_source = body.get("source")
    event_time = body.get("time")
    
    # Your actual message data
    data = body.get("data", {})
    
    print(f"Event: id={event_id}, type={event_type}, source={event_source}")
    print(f"Data: {data}")
    
    return {"status": "SUCCESS"}
```

## Publishing with Custom CloudEvent Attributes

Set the event type and source when publishing:

```bash
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "com.example.orders.placed",
    "source": "/order-service/v2",
    "id": "custom-event-id-001",
    "datacontenttype": "application/json",
    "data": {
      "orderId": "123",
      "item": "book",
      "quantity": 1
    }
  }'
```

In Python:

```python
import requests
import uuid
from datetime import datetime, timezone

event = {
    "specversion": "1.0",
    "type": "com.example.orders.placed",
    "source": "/order-service/v2",
    "id": str(uuid.uuid4()),
    "time": datetime.now(timezone.utc).isoformat(),
    "datacontenttype": "application/json",
    "data": {
        "orderId": "123",
        "item": "book"
    }
}

requests.post(
    "http://localhost:3500/v1.0/publish/pubsub/orders",
    headers={"Content-Type": "application/cloudevents+json"},
    json=event
)
```

## Adding CloudEvent Extensions

CloudEvents supports custom extension attributes:

```python
event = {
    "specversion": "1.0",
    "type": "com.example.orders.placed",
    "source": "/order-service",
    "id": str(uuid.uuid4()),
    "datacontenttype": "application/json",
    # Custom extensions
    "correlationid": "request-abc-123",
    "tenantid": "tenant-456",
    "priority": "high",
    "data": {"orderId": "123"}
}
```

Access these in the subscriber:

```python
@app.post("/orders/received")
async def receive_order(request: Request):
    body = await request.json()
    correlation_id = body.get("correlationid")
    tenant_id = body.get("tenantid")
    data = body.get("data", {})
    # ...
```

## Using the Dapr SDK for CloudEvents

The Dapr Python SDK can publish custom CloudEvents by serializing them as JSON:

```python
import json
import uuid
from dapr.clients import DaprClient

with DaprClient() as client:
    cloud_event = {
        "specversion": "1.0",
        "type": "com.example.orders.placed",
        "source": "/order-service",
        "id": str(uuid.uuid4()),
        "datacontenttype": "application/json",
        "data": {"orderId": "123", "item": "book"}
    }
    
    client.publish_event(
        pubsub_name="pubsub",
        topic_name="orders",
        data=json.dumps(cloud_event),
        data_content_type="application/cloudevents+json"
    )
```

## Content-Based Routing with CloudEvent Type

Use the CloudEvent `type` attribute for routing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-routing
spec:
  topic: orders
  pubsubname: pubsub
  routes:
    rules:
      - match: event.type == "com.example.orders.placed"
        path: /orders/new
      - match: event.type == "com.example.orders.cancelled"
        path: /orders/cancel
      - match: event.type == "com.example.orders.shipped"
        path: /orders/fulfill
    default: /orders/default
```

## Verifying CloudEvent Format

When debugging, check that messages arrive in CloudEvent format:

```python
@app.post("/debug/all-events")
async def debug_events(request: Request):
    body = await request.json()
    print(json.dumps(body, indent=2))
    return {"status": "SUCCESS"}
```

This will print the complete CloudEvent envelope.

## Summary

Dapr automatically wraps pub/sub messages in CloudEvents format, providing standard metadata like event ID, type, source, and timestamp. Publish custom CloudEvents by setting `Content-Type: application/cloudevents+json` and structuring the body as a CloudEvent. Access CloudEvent attributes alongside your message data in subscribers, and use the `event.type` attribute in Dapr routing rules for content-based message dispatch to different handlers.
