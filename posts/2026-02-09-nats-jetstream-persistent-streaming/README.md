# How to Deploy NATS JetStream for Persistent Message Streaming on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NATS, JetStream, Streaming

Description: Learn how to deploy NATS JetStream on Kubernetes for persistent message streaming with guaranteed delivery, stream replication, and high-performance event processing.

---

NATS JetStream extends the core NATS messaging system with persistence, replay capabilities, and distributed streaming. Unlike traditional NATS which provides at-most-once delivery, JetStream offers at-least-once and exactly-once semantics, making it suitable for use cases requiring durability and message replay.

In this guide, you'll learn how to deploy NATS with JetStream enabled, configure streams and consumers, implement message persistence, and optimize JetStream for production workloads on Kubernetes.

## Understanding NATS JetStream

JetStream provides:

- **Message persistence** - Store messages on disk or in memory
- **Stream replication** - Distribute streams across cluster nodes
- **Message replay** - Consume from any point in the stream
- **At-least-once delivery** - Acknowledgment-based consumption
- **Exactly-once semantics** - Deduplication based on message IDs
- **Push and pull consumers** - Flexible consumption patterns

JetStream is ideal for event sourcing, audit logs, time-series data, and any scenario requiring message durability.

## Deploying NATS with JetStream

Create a NATS StatefulSet with JetStream enabled:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nats-config
  namespace: nats
data:
  nats.conf: |
    port: 4222
    monitor_port: 8222

    jetstream {
      store_dir: /data/jetstream
      max_mem: 1G
      max_file: 10G
    }

    cluster {
      name: nats-cluster
      port: 6222
      routes: [
        nats://nats-0.nats:6222,
        nats://nats-1.nats:6222,
        nats://nats-2.nats:6222
      ]
    }
---
apiVersion: v1
kind: Service
metadata:
  name: nats
  namespace: nats
spec:
  selector:
    app: nats
  clusterIP: None
  ports:
  - name: client
    port: 4222
  - name: cluster
    port: 6222
  - name: monitor
    port: 8222
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: nats
spec:
  serviceName: nats
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
      - name: nats
        image: nats:2.10-alpine
        ports:
        - containerPort: 4222
          name: client
        - containerPort: 6222
          name: cluster
        - containerPort: 8222
          name: monitor
        command:
        - nats-server
        - --config
        - /etc/nats/nats.conf
        volumeMounts:
        - name: config
          mountPath: /etc/nats
        - name: data
          mountPath: /data
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
      volumes:
      - name: config
        configMap:
          name: nats-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

Deploy NATS:

```bash
kubectl create namespace nats
kubectl apply -f nats-jetstream.yaml

# Verify deployment
kubectl get pods -n nats
kubectl wait --for=condition=ready pod -l app=nats -n nats --timeout=180s
```

## Creating JetStream Streams

Streams store messages and define retention policies. Create a stream using the NATS CLI:

```bash
# Install nats CLI
kubectl run nats-box --image=natsio/nats-box:latest --rm -it -- sh

# Inside the pod, create a stream
nats stream add EVENTS \
  --subjects "events.>" \
  --storage file \
  --replicas 3 \
  --retention limits \
  --max-msgs=-1 \
  --max-bytes=-1 \
  --max-age=168h \
  --max-msg-size=-1 \
  --discard old
```

Create streams programmatically:

```go
package main

import (
    "log"
    "time"
    "github.com/nats-io/nats.go"
)

func main() {
    nc, err := nats.Connect("nats://nats.nats.svc.cluster.local:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    js, err := nc.JetStream()
    if err != nil {
        log.Fatal(err)
    }

    // Create stream
    stream, err := js.AddStream(&nats.StreamConfig{
        Name:     "ORDERS",
        Subjects: []string{"orders.*"},
        Storage:  nats.FileStorage,
        Replicas: 3,
        MaxAge:   7 * 24 * time.Hour,  // 7 days retention
    })
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Created stream: %s", stream.Config.Name)
}
```

## Publishing Messages to JetStream

Publish with acknowledgment:

```go
func publishMessages(js nats.JetStreamContext) {
    // Publish and wait for ack
    ack, err := js.Publish("orders.created", []byte(`{"id": 123, "total": 99.99}`))
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Published message, seq: %d, stream: %s", ack.Sequence, ack.Stream)

    // Publish with deduplication
    ack, err = js.Publish("orders.updated",
        []byte(`{"id": 123, "status": "shipped"}`),
        nats.MsgId("order-123-update-1"))
    if err != nil {
        log.Fatal(err)
    }
}
```

Python example:

```python
import asyncio
from nats.aio.client import Client as NATS
from nats.js import JetStreamContext

async def publish_messages():
    nc = NATS()
    await nc.connect("nats://nats.nats.svc.cluster.local:4222")

    js: JetStreamContext.jetstream = nc.jetstream()

    # Publish message
    ack = await js.publish("events.user.signup", b'{"user_id": 123}')
    print(f"Published: seq={ack.seq}, stream={ack.stream}")

    await nc.close()

asyncio.run(publish_messages())
```

## Creating JetStream Consumers

Consumers track consumption progress. Create a durable consumer:

```bash
nats consumer add EVENTS consumer1 \
  --filter "events.orders.>" \
  --ack explicit \
  --pull \
  --deliver all \
  --max-deliver 3 \
  --wait 30s
```

Pull consumer in Go:

```go
func consumeMessages(js nats.JetStreamContext) {
    // Create durable pull consumer
    sub, err := js.PullSubscribe("orders.*", "order-processor", nats.Durable("order-processor"))
    if err != nil {
        log.Fatal(err)
    }

    for {
        // Fetch batch of messages
        msgs, err := sub.Fetch(10, nats.MaxWait(5*time.Second))
        if err != nil {
            log.Printf("Fetch error: %v", err)
            continue
        }

        for _, msg := range msgs {
            log.Printf("Received: %s", string(msg.Data))

            // Process message
            if err := processOrder(msg.Data); err != nil {
                // Negative ack - will be redelivered
                msg.Nak()
            } else {
                // Acknowledge successful processing
                msg.Ack()
            }
        }
    }
}
```

Push consumer:

```go
func pushConsumer(js nats.JetStreamContext) {
    // Subscribe with push consumer
    sub, err := js.Subscribe("events.*", func(msg *nats.Msg) {
        log.Printf("Received: %s", string(msg.Data))
        msg.Ack()
    }, nats.Durable("event-processor"))
    if err != nil {
        log.Fatal(err)
    }
    defer sub.Unsubscribe()

    // Keep running
    select {}
}
```

## Implementing Message Replay

Replay messages from specific points:

```go
// Start from beginning
sub, _ := js.PullSubscribe("orders.*", "replay-consumer",
    nats.DeliverAll())

// Start from sequence
sub, _ := js.PullSubscribe("orders.*", "replay-consumer",
    nats.StartSequence(1000))

// Start from time
startTime := time.Now().Add(-24 * time.Hour)
sub, _ := js.PullSubscribe("orders.*", "replay-consumer",
    nats.StartTime(startTime))

// Start from last received
sub, _ := js.PullSubscribe("orders.*", "replay-consumer",
    nats.DeliverLast())
```

## Configuring Stream Replication

Replicate streams across cluster nodes:

```bash
nats stream add CRITICAL \
  --subjects "critical.>" \
  --storage file \
  --replicas 3 \
  --max-age 30d
```

Verify replication:

```bash
nats stream info CRITICAL

# Output shows replica placement
Stream Info
...
Replicas: 3
  nats-0: current, lag 0
  nats-1: current, lag 0
  nats-2: current, lag 0
```

## Implementing Exactly-Once Processing

Use message deduplication:

```go
// Publisher side - set unique message ID
js.Publish("orders.created",
    []byte(`{"order_id": 123}`),
    nats.MsgId("order-123-created"))

// Duplicate publish will be deduplicated
js.Publish("orders.created",
    []byte(`{"order_id": 123}`),
    nats.MsgId("order-123-created"))  // Ignored by JetStream
```

Consumer with idempotency:

```go
func processWithIdempotency(msg *nats.Msg) {
    msgID := msg.Header.Get(nats.MsgIdHdr)

    // Check if already processed
    if isProcessed(msgID) {
        msg.Ack()
        return
    }

    // Process message
    if err := process(msg.Data); err != nil {
        msg.Nak()
        return
    }

    // Mark as processed and ack
    markProcessed(msgID)
    msg.Ack()
}
```

## Monitoring JetStream

Deploy NATS Surveyor for monitoring:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats-surveyor
  namespace: nats
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats-surveyor
  template:
    metadata:
      labels:
        app: nats-surveyor
    spec:
      containers:
      - name: surveyor
        image: natsio/nats-surveyor:latest
        args:
        - -s
        - nats://nats:4222
        - -creds
        - /etc/nats/creds
        ports:
        - containerPort: 7777
          name: metrics
```

Create Prometheus alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: nats-jetstream-alerts
spec:
  groups:
  - name: jetstream
    rules:
    - alert: JetStreamStreamLagging
      expr: |
        nats_jetstream_stream_lag > 10000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "JetStream stream lagging"

    - alert: JetStreamConsumerNotAcking
      expr: |
        rate(nats_jetstream_consumer_ack_pending[5m]) > 100
      for: 10m
      labels:
        severity: warning
```

## Best Practices

Follow these practices:

1. **Use file storage for durability** - Memory storage is faster but not persistent
2. **Set appropriate replicas** - Use 3 replicas for production
3. **Configure retention** - Balance storage costs with replay requirements
4. **Use pull consumers for scaling** - Multiple instances can share workload
5. **Implement idempotency** - Use message IDs for deduplication
6. **Monitor stream lag** - Alert on growing backlogs
7. **Test failure scenarios** - Verify behavior during pod restarts

## Conclusion

NATS JetStream provides a powerful streaming platform combining NATS' simplicity with persistence and replay capabilities. By understanding streams, consumers, and replication, you can build resilient event-driven systems on Kubernetes.

JetStream's performance, combined with Kubernetes deployment patterns, enables high-throughput message streaming with strong delivery guarantees. Whether building event sourcing systems, audit logs, or real-time data pipelines, JetStream offers a compelling alternative to heavier message brokers.
