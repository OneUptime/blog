# How to Implement Header-Based Routing with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Routing, Header, Messaging

Description: Learn how to implement header-based message routing in Dapr Pub/Sub using CloudEvents metadata attributes and CEL expressions to route messages by their header values.

---

## What Is Header-Based Routing?

Header-based routing (analogous to AMQP header exchanges) routes messages based on metadata fields rather than the message body. In Dapr, CloudEvents attributes and custom metadata fields serve as "headers." CEL expressions in subscription routing rules can match on these attributes to direct messages to the right handlers.

## Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: events-pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

## Publishing with CloudEvents Metadata

Publish messages and include metadata that acts as routing headers:

```python
from dapr.clients import DaprClient
import json

def publish_with_headers(event_type: str, priority: str, region: str, payload: dict) -> None:
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="events-pubsub",
            topic_name="system-events",
            data=json.dumps(payload),
            data_content_type="application/json",
            publish_metadata={
                # These become CloudEvents extensions / headers
                "cloudevent.type": event_type,
                "cloudevent.source": "order-service",
                "cloudevent.priority": priority,      # custom extension
                "cloudevent.region": region,          # custom extension
                "cloudevent.version": "v2",           # custom extension
            },
        )

# Publish events with different headers
publish_with_headers("order.created", priority="high", region="us-east", payload={"orderId": "1"})
publish_with_headers("order.created", priority="low", region="eu-west", payload={"orderId": "2"})
publish_with_headers("order.cancelled", priority="high", region="us-east", payload={"orderId": "3"})
```

## Header-Based Routing Rules

Define routing rules that match on CloudEvents attributes:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: header-routing
spec:
  pubsubname: events-pubsub
  topic: system-events
  routes:
    rules:
    # Route by event type AND priority header
    - match: 'event.type == "order.created" && event.priority == "high"'
      path: /events/priority-orders
    # Route by region header
    - match: 'event.region == "eu-west"'
      path: /events/eu
    # Route by event type only
    - match: 'event.type == "order.cancelled"'
      path: /events/cancellations
    # Route by version header
    - match: 'event.version == "v2"'
      path: /events/v2
    default: /events/default
  scopes:
  - event-processor
```

## Programmatic Routing with Headers

```javascript
const { DaprServer, DaprClient } = require('@dapr/dapr');

// Publisher
const client = new DaprClient();

async function publishEvent(type, headers, data) {
  // Prefix custom keys with 'cloudevent.' so they become CloudEvents extensions
  const metadata = { 'cloudevent.type': type };
  for (const [key, value] of Object.entries(headers)) {
    metadata[`cloudevent.${key}`] = value;
  }
  await client.pubsub.publish('events-pubsub', 'system-events', data, { metadata });
}

// Subscriber
const server = new DaprServer({ serverPort: '3000' });

server.pubsub.subscribeWithOptions('events-pubsub', 'system-events', {
  route: {
    rules: [
      {
        match: 'event.priority == "high"',
        path: '/events/high-priority',
      },
      {
        match: 'event.region == "eu-west"',
        path: '/events/eu',
      },
    ],
    default: '/events/standard',
  },
});

// High-priority handler
server.pubsub.subscribe('events-pubsub', 'events/high-priority', async (data, headers) => {
  console.log('High priority event:', data);
  await priorityQueue.process(data);
});

// EU handler
server.pubsub.subscribe('events-pubsub', 'events/eu', async (data) => {
  console.log('EU region event:', data);
  await euProcessor.handle(data);
});

await server.start();
```

## Accessing Headers in Handlers

CloudEvents extensions are available in the message envelope:

```python
# FastAPI handler receiving CloudEvents with headers
from fastapi import FastAPI, Request

app = FastAPI()

@app.post('/events/priority-orders')
async def handle_priority(request: Request):
    cloud_event = await request.json()
    # Access standard CloudEvents attributes
    event_type = cloud_event.get('type')
    source = cloud_event.get('source')
    # Access custom extensions (headers)
    priority = cloud_event.get('priority')
    region = cloud_event.get('region')
    payload = cloud_event.get('data')

    print(f"Priority order: type={event_type}, region={region}, priority={priority}")
    return {"status": "processed"}
```

## Summary

Dapr header-based routing uses CloudEvents extensions as message headers, and CEL expressions in subscription routing rules to match on those headers. Publish events with `publish_metadata` for custom header values, and route messages to different paths based on type, priority, region, or any custom attribute. This enables RabbitMQ-style header exchange behavior within the Dapr ecosystem.
