# How to Implement Event Store with Dapr and Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Sourcing, Redis, Pub/Sub, Architecture

Description: Use Dapr pub/sub with Redis Streams to build a lightweight event store that persists events in an ordered log and supports consumer group-based event processing.

---

Redis Streams provide an append-only log with consumer groups, making them a natural fit for event streaming. When used as a Dapr pub/sub backend, Redis Streams act as both the event transport and a short-term event store. For longer retention, combine Streams with Redis persistence.

## Redis Streams vs. Redis State

Redis Streams (pub/sub) differ from Redis as a state store:
- **Streams**: Append-only log, supports consumer groups, ordered by stream ID
- **State store**: Key-value store with get/set/delete, not ordered

For event sourcing, use Redis Streams for the event log and optionally Redis state store for aggregate snapshots.

## Dapr Pub/Sub Component with Redis Streams

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: event-stream
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: processingTimeout
      value: "60s"
    - name: redeliverInterval
      value: "2s"
```

## Publishing Events to a Stream

```go
// publish_event.go
package eventstore

import (
    "context"
    dapr "github.com/dapr/go-sdk/client"
)

type DomainEvent struct {
    EventID       string                 `json:"eventId"`
    EventType     string                 `json:"eventType"`
    AggregateID   string                 `json:"aggregateId"`
    AggregateType string                 `json:"aggregateType"`
    Sequence      int64                  `json:"sequence"`
    Payload       map[string]interface{} `json:"payload"`
    OccurredAt    string                 `json:"occurredAt"`
}

func PublishEvent(client dapr.Client, event DomainEvent) error {
    return client.PublishEvent(
        context.Background(),
        "event-stream",
        event.EventType,
        event,
        dapr.PublishEventWithMetadata(map[string]string{
            "aggregateId": event.AggregateID,
        }),
    )
}
```

## Subscribing to Events

```go
// main.go
package main

import (
    "context"
    "encoding/json"
    "log"
    daprd "github.com/dapr/go-sdk/service/http"
    "github.com/dapr/go-sdk/service/common"
)

func main() {
    s := daprd.NewService(":8080")

    s.AddTopicEventHandler(&common.Subscription{
        PubsubName: "event-stream",
        Topic:      "OrderCreated",
        Route:      "/events/order-created",
    }, handleOrderCreated)

    log.Fatal(s.Start())
}

func handleOrderCreated(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    var event DomainEvent
    json.Unmarshal(e.RawData, &event)
    log.Printf("Processing OrderCreated for aggregate %s", event.AggregateID)
    return false, nil
}
```

## Configuring Redis Persistence

Enable Redis AOF (Append Only File) persistence to ensure events survive restarts:

```bash
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG SET appendfsync everysec
```

Or in `redis.conf`:

```text
appendonly yes
appendfsync everysec
save 900 1
save 300 10
```

## Event Replay from Redis Streams

Redis Streams support reading from any point in the stream. Use the `XRANGE` command to replay events from a specific timestamp:

```bash
# Read all events in a stream after a specific ID
redis-cli XRANGE orders-stream 0 + COUNT 100

# Read events after a specific stream ID
redis-cli XRANGE orders-stream 1711900000000-0 + COUNT 50
```

## Dead Letter Topics

Configure a dead letter topic for events that fail processing. Dead letter topics are set at the subscription level, not the component level. In a declarative subscription:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-events
spec:
  topic: OrderCreated
  routes:
    default: /events/order-created
  pubsubname: event-stream
  deadLetterTopic: orders-dead-letter
```

Or programmatically when defining a subscription in Go:

```go
s.AddTopicEventHandler(&common.Subscription{
    PubsubName:      "event-stream",
    Topic:           "OrderCreated",
    Route:           "/events/order-created",
    DeadLetterTopic: "orders-dead-letter",
}, handleOrderCreated)
```

## Summary

Redis Streams via Dapr pub/sub provide a lightweight, high-throughput event store with built-in consumer groups and ordering guarantees. Combined with Redis AOF persistence, this pattern suits event-driven architectures that need fast event throughput without the operational complexity of Kafka.
