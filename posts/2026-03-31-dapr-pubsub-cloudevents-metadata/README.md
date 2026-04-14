# How to Use Dapr Pub/Sub with CloudEvents Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, CloudEvent, Metadata, Event, Messaging

Description: Learn how to attach and read CloudEvents metadata in Dapr pub/sub to carry tracing context, content type, and custom attributes alongside messages.

---

## CloudEvents Metadata in Dapr

When Dapr wraps a published message as a CloudEvent, it automatically attaches standard metadata fields. You can also extend CloudEvents with custom attributes and read all metadata fields in your subscriber. This metadata helps with tracing, routing, and correlation of distributed events.

## Standard CloudEvents Fields

A Dapr-wrapped message includes these envelope fields:

| Field | Description |
|-------|-------------|
| `id` | Unique event identifier (UUID) |
| `source` | App ID of the publisher |
| `type` | Event type string |
| `specversion` | CloudEvents specification version |
| `datacontenttype` | MIME type of the data payload |
| `traceid` | Distributed trace ID |
| `traceparent` | W3C Trace Context parent ID (same value as traceid) |
| `tracestate` | W3C Trace Context state |
| `time` | ISO 8601 timestamp |
| `topic` | The pub/sub topic name |
| `pubsubname` | Name of the Dapr pub/sub component |

## Publishing with Custom CloudEvents Metadata

When publishing via the Dapr HTTP API, you can add custom CloudEvents extension attributes by including them as HTTP headers with the prefix `ce_`:

```bash
curl -X POST http://localhost:3500/v1.0/publish/kafka-pubsub/orders \
  -H "Content-Type: application/json" \
  -H "ce_correlationid: order-abc-123" \
  -H "ce_environment: production" \
  -d '{"orderId": "abc-123", "amount": 99.99}'
```

## Publishing via the Dapr SDK (Python)

```python
import json
from dapr.clients import DaprClient

with DaprClient() as client:
    client.publish_event(
        pubsub_name="kafka-pubsub",
        topic_name="orders",
        data=json.dumps({"orderId": "abc-123", "amount": 99.99}),
        data_content_type="application/json",
        publish_metadata={
            "cloudevent.correlationid": "order-abc-123",
            "cloudevent.environment": "production"
        }
    )
```

## Reading CloudEvents Metadata in a Subscriber

A subscriber receives the full CloudEvents envelope. In Node.js, access the metadata from the request body:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/orders', (req, res) => {
  const event = req.body;

  console.log('Event ID:', event.id);
  console.log('Source:', event.source);
  console.log('Type:', event.type);
  console.log('Trace ID:', event.traceid);
  console.log('Correlation ID:', event.correlationid);
  console.log('Data:', event.data);

  res.sendStatus(200);
});

app.listen(3000);
```

## Reading Metadata in Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

type CloudEvent struct {
    ID            string          `json:"id"`
    Source        string          `json:"source"`
    Type          string          `json:"type"`
    SpecVersion   string          `json:"specversion"`
    TraceID       string          `json:"traceid"`
    CorrelationID string          `json:"correlationid"`
    Data          json.RawMessage `json:"data"`
}

func orderHandler(w http.ResponseWriter, r *http.Request) {
    var event CloudEvent
    json.NewDecoder(r.Body).Decode(&event)

    fmt.Printf("Processing event ID=%s source=%s correlationid=%s\n",
        event.ID, event.Source, event.CorrelationID)

    w.WriteHeader(http.StatusOK)
}
```

## Setting Content Type for Binary Data

When publishing binary or non-JSON payloads, set the `datacontenttype` header explicitly:

```bash
curl -X POST http://localhost:3500/v1.0/publish/kafka-pubsub/images \
  -H "Content-Type: application/octet-stream" \
  -H "ce_specversion: 1.0" \
  -H "ce_type: image.upload" \
  -H "ce_source: myapp" \
  -H "ce_id: img-event-001" \
  -H "ce_imageid: img-456" \
  --data-binary @image.png
```

## Using Metadata for Message Routing

You can use CloudEvents extension attributes to implement custom routing logic in your subscriber. For example, route to different handlers based on `ce_environment`:

```javascript
app.post('/orders', (req, res) => {
  const { data, environment } = req.body;
  if (environment === 'production') {
    handleProdOrder(data);
  } else {
    handleTestOrder(data);
  }
  res.sendStatus(200);
});
```

## Summary

Dapr automatically wraps published messages in CloudEvents envelopes that include tracing, source, and type metadata. You can extend these envelopes with custom attributes using the `ce_` header prefix or SDK publish metadata options. Subscribers receive the full envelope and can read both standard and custom metadata fields to implement routing, correlation, and observability logic.
