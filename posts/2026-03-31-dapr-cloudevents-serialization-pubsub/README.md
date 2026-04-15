# How to Handle CloudEvents Serialization in Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CloudEvent, Pub/Sub, Serialization, Event

Description: Master CloudEvents serialization in Dapr pub/sub for publishing and consuming structured events with custom schemas, raw mode, and cross-service compatibility.

---

## CloudEvents in Dapr Pub/Sub

Dapr automatically wraps all pub/sub messages in the CloudEvents 1.0 envelope format. Understanding this structure is essential for correctly publishing and consuming events, especially when integrating with external systems or when using custom event schemas.

A CloudEvent envelope from Dapr looks like:

```json
{
  "specversion": "1.0",
  "type": "com.example.order.created",
  "source": "order-service",
  "id": "a396e6f0-8ab2-11ec-b909-0242ac120002",
  "time": "2026-03-31T10:00:00Z",
  "datacontenttype": "application/json",
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "data": {
    "orderId": "order-123",
    "customerId": "cust-456",
    "amount": 99.99
  }
}
```

## Publishing with CloudEvents in .NET

```csharp
using Dapr.Client;
using System.Text.Json;

public class OrderEventPublisher
{
    private readonly DaprClient _dapr;

    public OrderEventPublisher(DaprClient dapr)
    {
        _dapr = dapr;
    }

    public async Task PublishOrderCreatedAsync(Order order)
    {
        // Simple publish - Dapr wraps in CloudEvent
        await _dapr.PublishEventAsync("pubsub", "order-created", order);
    }

    public async Task PublishWithMetadataAsync(Order order)
    {
        // Publish with CloudEvent metadata
        var metadata = new Dictionary<string, string>
        {
            ["cloudevent.type"] = "com.example.order.created",
            ["cloudevent.source"] = "/order-service/v1",
            ["cloudevent.subject"] = $"order/{order.Id}"
        };

        await _dapr.PublishEventAsync("pubsub", "order-created", order, metadata);
    }
}

// Subscriber - accessing the full CloudEvent envelope
// Do not register app.UseCloudEvents() middleware if you need the full envelope
[Topic("pubsub", "order-created")]
[HttpPost("order-events")]
public async Task<IActionResult> HandleOrderEvent(
    [FromBody] JsonElement cloudEvent)
{
    var order = cloudEvent.GetProperty("data").Deserialize<Order>();
    var eventId = cloudEvent.GetProperty("id").GetString();
    var source = cloudEvent.GetProperty("source").GetString();

    _logger.LogInformation(
        "Received event {EventId} from {Source} for order {OrderId}",
        eventId, source, order?.Id);

    return Ok();
}
```

## Raw Mode - Bypassing CloudEvents

```yaml
# Subscribe without CloudEvent wrapping (raw mode)
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: raw-subscription
spec:
  pubsubname: pubsub
  topic: legacy-events
  routes:
    default: /events/legacy
  metadata:
    rawPayload: "true"
```

```csharp
// Publish without CloudEvent wrapping
var metadata = new Dictionary<string, string>
{
    ["rawPayload"] = "true"
};

await _dapr.PublishEventAsync(
    "pubsub", "legacy-events",
    rawPayload,
    metadata);
```

## Node.js CloudEvent Publishing

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

// Publish - Dapr auto-wraps in CloudEvent
async function publishEvent(orderId, eventData) {
  await client.pubsub.publish('pubsub', 'order-created', eventData);
}

// Subscribe and access CloudEvent fields
app.post('/events/order-created', (req, res) => {
  const {
    id,         // CloudEvent ID
    source,     // CloudEvent source
    type,       // CloudEvent type
    time,       // CloudEvent timestamp
    traceparent,
    data        // Your payload
  } = req.body;

  console.log(`Event ${id} from ${source}:`, data);
  res.sendStatus(200);
});
```

## Python CloudEvent Handling

```python
from fastapi import FastAPI
from dapr.ext.fastapi import DaprApp
import json

app = FastAPI()
dapr_app = DaprApp(app)

@dapr_app.subscribe(pubsub='pubsub', topic='order-created')
async def handle_order(event: dict):
    # event contains the full CloudEvent envelope
    event_id = event.get('id')
    event_type = event.get('type')
    trace_parent = event.get('traceparent', '')
    order = event.get('data', {})

    print(f"CloudEvent {event_id} type={event_type}")
    print(f"Order: {order}")

    # Return 200 to acknowledge
    return {'status': 'SUCCESS'}
```

## Summary

Dapr automatically wraps all pub/sub messages in CloudEvents 1.0 format, adding metadata like event ID, source, type, timestamp, and distributed trace headers. Subscribers receive the full CloudEvent envelope, giving access to routing metadata alongside the data payload. Use raw mode when integrating with legacy systems that don't support CloudEvents, or when an external message broker sends non-CloudEvent messages.
