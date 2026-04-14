# How to Use Dapr Pub/Sub Between Node.js and Go Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Node.js, Go, Messaging, Event-Driven

Description: Build an event-driven pipeline where a Node.js service publishes events and a Go service subscribes to them using Dapr pub/sub with Redis as the broker.

---

Event-driven architectures benefit from Dapr pub/sub when services are written in different languages. This guide shows a Node.js event publisher paired with a Go subscriber, connected through Dapr's pub/sub API.

## Shared Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: event-pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: enableTLS
    value: "false"
```

## Node.js Publisher

Use the Dapr Node.js SDK to publish events:

```javascript
// publisher.js
const { DaprClient, CommunicationProtocolEnum } = require('@dapr/dapr');

const client = new DaprClient({
  daprHost: '127.0.0.1',
  daprPort: process.env.DAPR_HTTP_PORT || '3500',
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

const PUBSUB_NAME = 'event-pubsub';
const TOPIC = 'user-events';

async function publishUserEvent(userId, eventType, payload) {
  const event = {
    userId,
    eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  await client.pubsub.publish(PUBSUB_NAME, TOPIC, event);
  console.log(`Published event: ${eventType} for user ${userId}`);
}

// Express API to trigger publishing
const express = require('express');
const app = express();
app.use(express.json());

app.post('/events', async (req, res) => {
  const { userId, eventType, payload } = req.body;
  try {
    await publishUserEvent(userId, eventType, payload);
    res.json({ published: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Publisher on port 3000'));
```

## Go Subscriber

The Go service subscribes to user events using the Go Dapr SDK:

```go
// subscriber.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
)

type UserEvent struct {
    UserID    string          `json:"userId"`
    EventType string          `json:"eventType"`
    Payload   json.RawMessage `json:"payload"`
    Timestamp string          `json:"timestamp"`
}

var subscription = &common.Subscription{
    PubsubName: "event-pubsub",
    Topic:      "user-events",
    Route:      "/user-events",
}

func handleUserEvent(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    var event UserEvent
    if err := json.Unmarshal(e.RawData, &event); err != nil {
        log.Printf("Failed to parse event: %v", err)
        return false, err
    }

    fmt.Printf("Received %s event for user %s at %s\n",
        event.EventType, event.UserID, event.Timestamp)

    // Process event based on type
    switch event.EventType {
    case "login":
        fmt.Printf("User %s logged in\n", event.UserID)
    case "purchase":
        fmt.Printf("User %s made a purchase\n", event.UserID)
    default:
        fmt.Printf("Unknown event type: %s\n", event.EventType)
    }

    return false, nil
}

func main() {
    s := daprd.NewService(":8080")

    if err := s.AddTopicEventHandler(subscription, handleUserEvent); err != nil {
        log.Fatalf("error adding topic subscription: %v", err)
    }

    log.Println("Go subscriber starting on :8080")
    if err := s.Start(); err != nil {
        log.Fatalf("error starting service: %v", err)
    }
}
```

## Testing the Pipeline

```bash
# Port-forward the Node.js publisher
kubectl port-forward deployment/event-publisher-node 3000:3000

# Publish a login event
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "eventType": "login", "payload": {"ip": "192.168.1.1"}}'

# Watch Go subscriber logs
kubectl logs -l app=event-subscriber-go -f
```

## Handling Retries in Go

Return `true` for the retry parameter when transient errors occur:

```go
func handleUserEvent(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    if err := processEvent(e); err != nil {
        if isTransient(err) {
            return true, err  // Signal Dapr to retry
        }
        return false, err  // Permanent failure - drop (or dead-letter if configured)
    }
    return false, nil
}
```

## Summary

Dapr pub/sub between Node.js and Go uses the respective SDKs to publish and subscribe to a shared topic. The Node.js publisher uses the Dapr client's `pubsub.publish` method while the Go subscriber registers a topic handler via the service API. Both services remain fully decoupled, enabling independent deployment and scaling.
