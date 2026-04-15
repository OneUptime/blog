# How to Set Up NATS Streaming with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NATS, NATS Streaming, JetStream, Streaming, Data Pipeline

Description: Integrate NATS JetStream with ClickHouse by building a subscriber application that batches messages and inserts them efficiently.

---

NATS is a lightweight, high-performance messaging system. NATS JetStream adds persistence and streaming capabilities, making it a viable alternative to Kafka for event ingestion pipelines feeding ClickHouse.

## Architecture

```text
NATS JetStream --> Subscriber App --> ClickHouse HTTP API
```

ClickHouse has a native NATS table engine (since v22.8), but for JetStream workloads that need batching, backpressure control, or message transformation before insertion, an external consumer application gives you more flexibility.

## Create the ClickHouse Target Table

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32,
    payload String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);
```

## NATS JetStream Subscriber in Go

Go is the native language for NATS. Here is a minimal subscriber that batches messages and inserts into ClickHouse:

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "time"

    "github.com/nats-io/nats.go"
)

type Event struct {
    EventTime string `json:"event_time"`
    EventType string `json:"event_type"`
    UserID    int    `json:"user_id"`
    Payload   string `json:"payload"`
}

func main() {
    nc, _ := nats.Connect("nats://localhost:4222")
    js, _ := nc.JetStream()

    sub, _ := js.PullSubscribe("events.>", "clickhouse-consumer")

    buffer := []Event{}
    ticker := time.NewTicker(500 * time.Millisecond)

    for {
        select {
        case <-ticker.C:
            msgs, _ := sub.Fetch(1000, nats.MaxWait(100*time.Millisecond))
            for _, msg := range msgs {
                var e Event
                json.Unmarshal(msg.Data, &e)
                buffer = append(buffer, e)
                msg.Ack()
            }
            if len(buffer) > 0 {
                insertToClickHouse(buffer)
                buffer = buffer[:0]
            }
        }
    }
}

func insertToClickHouse(events []Event) {
    var body bytes.Buffer
    for _, e := range events {
        line, _ := json.Marshal(e)
        body.Write(line)
        body.WriteByte('\n')
    }
    url := "http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow"
    http.Post(url, "application/x-ndjson", &body)
}
```

## NATS JetStream Setup

Create a stream and consumer in NATS:

```bash
# Create stream
nats stream add EVENTS \
  --subjects "events.>" \
  --storage file \
  --retention limits \
  --max-msgs -1

# Create consumer
nats consumer add EVENTS clickhouse-consumer \
  --pull \
  --deliver all \
  --ack explicit \
  --max-deliver 5
```

## Handling Redelivery

NATS JetStream redelivers unacknowledged messages. Ensure idempotent inserts or use deduplication:

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32,
    payload String
) ENGINE = ReplacingMergeTree()
ORDER BY (event_type, event_time, user_id);
```

## Monitor Consumer Lag

```bash
nats consumer info EVENTS clickhouse-consumer
```

## Summary

NATS JetStream integrates with ClickHouse via a custom consumer application. Use pull-based consumers to control fetch rates, batch messages before inserting, and optionally use ReplacingMergeTree for deduplication when redelivery is possible. Go's native NATS client provides the best performance for this pipeline.
