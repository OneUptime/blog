# How to Implement NATS JetStream Event-Driven Architecture on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NATS, JetStream, Event-Driven, Microservices

Description: Build scalable event-driven architectures on Kubernetes using NATS JetStream for reliable message streaming with persistence and exactly-once delivery.

---

NATS JetStream brings persistence, streaming, and exactly-once delivery semantics to the lightweight NATS messaging system. When deployed on Kubernetes, it provides a powerful foundation for event-driven architectures that are both performant and reliable. This guide shows you how to implement NATS JetStream for production event-driven systems.

## Why Choose NATS JetStream for Event-Driven Architecture

Traditional NATS excels at high-performance, fire-and-forget messaging. JetStream extends this with persistent streams, message replay, and acknowledgment-based delivery. This makes it suitable for scenarios where message durability matters.

JetStream uses a stream-first model. You create streams that capture messages on specific subjects, then create consumers that process those messages. This decoupling between message capture and consumption enables flexible architectures where multiple consumers can process the same events independently.

Compared to Kafka, JetStream offers simpler operations and lower resource overhead. It integrates naturally with cloud-native environments and provides built-in clustering and replication without complex configuration.

## Installing NATS with JetStream on Kubernetes

Deploy NATS with JetStream enabled using Helm. First, add the NATS Helm repository:

```bash
# Add NATS Helm repository
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

# Create namespace
kubectl create namespace nats-system
```

Create a values file for JetStream configuration:

```yaml
# nats-values.yaml
nats:
  image: nats:latest

  # Enable JetStream
  jetstream:
    enabled: true

    # Storage configuration
    memStorage:
      enabled: true
      size: 2Gi
    fileStorage:
      enabled: true
      size: 10Gi
      storageClassName: fast-ssd

  # Cluster configuration for HA
  cluster:
    enabled: true
    replicas: 3

  # Resource limits
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

# Enable monitoring
exporter:
  enabled: true
  serviceMonitor:
    enabled: true
```

Install NATS:

```bash
helm install nats nats/nats \
  --namespace nats-system \
  --values nats-values.yaml

# Verify installation
kubectl get pods -n nats-system
kubectl exec -n nats-system nats-0 -- nats server info
```

## Creating JetStream Streams

Streams are the core of JetStream. They capture and store messages on subjects. Create a stream for user events:

```bash
# Connect to NATS pod
kubectl exec -n nats-system -it nats-0 -- sh

# Create a stream using NATS CLI
nats stream add USER_EVENTS \
  --subjects "users.*" \
  --storage file \
  --retention limits \
  --max-msgs=-1 \
  --max-bytes=1GB \
  --max-age=7d \
  --replicas 3 \
  --discard old
```

Or create streams programmatically using the NATS client. Here's a Go example:

```go
// stream-setup.go
package main

import (
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

func main() {
    // Connect to NATS
    nc, err := nats.Connect("nats://nats.nats-system.svc.cluster.local:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    // Get JetStream context
    js, err := nc.JetStream()
    if err != nil {
        log.Fatal(err)
    }

    // Create stream configuration
    streamConfig := &nats.StreamConfig{
        Name:     "USER_EVENTS",
        Subjects: []string{"users.*", "users.*.events"},
        Storage:  nats.FileStorage,
        Replicas: 3,
        MaxAge:   7 * 24 * time.Hour,
        MaxBytes: 1024 * 1024 * 1024, // 1GB
        Retention: nats.LimitsPolicy,
        Discard:   nats.DiscardOld,
    }

    // Create or update stream
    stream, err := js.AddStream(streamConfig)
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Stream created: %s", stream.Config.Name)
}
```

## Publishing Events to JetStream

Publishing to JetStream provides acknowledgments, ensuring messages are persisted before confirming to the publisher:

```go
// publisher.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

type UserEvent struct {
    EventID   string    `json:"event_id"`
    UserID    string    `json:"user_id"`
    Action    string    `json:"action"`
    Timestamp time.Time `json:"timestamp"`
    Metadata  map[string]string `json:"metadata"`
}

func main() {
    nc, err := nats.Connect("nats://nats.nats-system.svc.cluster.local:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    js, err := nc.JetStream()
    if err != nil {
        log.Fatal(err)
    }

    // Publish events with acknowledgment
    event := UserEvent{
        EventID:   "evt-12345",
        UserID:    "user-67890",
        Action:    "registration",
        Timestamp: time.Now(),
        Metadata: map[string]string{
            "source": "web-app",
            "region": "us-east-1",
        },
    }

    data, err := json.Marshal(event)
    if err != nil {
        log.Fatal(err)
    }

    // Publish with acknowledgment
    pubAck, err := js.Publish("users.registration", data)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Published message: stream=%s, sequence=%d\n",
        pubAck.Stream, pubAck.Sequence)

    // Publish with custom options
    pubAck, err = js.Publish("users.login", data,
        nats.MsgId("unique-msg-id-123"), // Deduplication
        nats.ExpectStream("USER_EVENTS"),
        nats.AckWait(5*time.Second),
    )
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Published with deduplication: sequence=%d\n", pubAck.Sequence)
}
```

## Creating Durable Consumers

Consumers track processing progress. Durable consumers maintain their state even if the application restarts:

```go
// consumer.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

func main() {
    nc, err := nats.Connect("nats://nats.nats-system.svc.cluster.local:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    js, err := nc.JetStream()
    if err != nil {
        log.Fatal(err)
    }

    // Create durable consumer configuration
    consumerConfig := &nats.ConsumerConfig{
        Durable:       "user-event-processor",
        AckPolicy:     nats.AckExplicitPolicy,
        AckWait:       30 * time.Second,
        MaxDeliver:    5,
        FilterSubject: "users.*",
        DeliverPolicy: nats.DeliverAllPolicy,
        ReplayPolicy:  nats.ReplayInstantPolicy,
    }

    // Add consumer to stream
    _, err = js.AddConsumer("USER_EVENTS", consumerConfig)
    if err != nil {
        log.Fatal(err)
    }

    // Subscribe with durable consumer
    sub, err := js.PullSubscribe("users.*", "user-event-processor")
    if err != nil {
        log.Fatal(err)
    }

    // Process messages
    for {
        messages, err := sub.Fetch(10, nats.MaxWait(5*time.Second))
        if err != nil {
            log.Printf("Fetch error: %v", err)
            continue
        }

        for _, msg := range messages {
            var event UserEvent
            if err := json.Unmarshal(msg.Data, &event); err != nil {
                log.Printf("Unmarshal error: %v", err)
                msg.Nak() // Negative acknowledgment
                continue
            }

            // Process the event
            if err := processEvent(&event); err != nil {
                log.Printf("Processing error: %v", err)
                msg.Nak()
                continue
            }

            // Acknowledge successful processing
            msg.Ack()
            fmt.Printf("Processed event: %s\n", event.EventID)
        }
    }
}

func processEvent(event *UserEvent) error {
    // Your business logic here
    fmt.Printf("Processing %s for user %s\n", event.Action, event.UserID)
    return nil
}
```

## Implementing Microservices with JetStream

Deploy microservices that communicate via JetStream events. Here's a complete example with publisher and consumer services:

```yaml
# publisher-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-publisher
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: event-publisher
  template:
    metadata:
      labels:
        app: event-publisher
    spec:
      containers:
      - name: publisher
        image: your-registry/event-publisher:latest
        env:
        - name: NATS_URL
          value: "nats://nats.nats-system.svc.cluster.local:4222"
        - name: STREAM_NAME
          value: "USER_EVENTS"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-consumer
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: event-consumer
  template:
    metadata:
      labels:
        app: event-consumer
    spec:
      containers:
      - name: consumer
        image: your-registry/event-consumer:latest
        env:
        - name: NATS_URL
          value: "nats://nats.nats-system.svc.cluster.local:4222"
        - name: STREAM_NAME
          value: "USER_EVENTS"
        - name: CONSUMER_NAME
          value: "user-event-processor"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

## Implementing Exactly-Once Delivery

JetStream supports message deduplication for exactly-once semantics:

```go
// exactly-once-publisher.go
package main

import (
    "fmt"
    "log"
    "time"

    "github.com/google/uuid"
    "github.com/nats-io/nats.go"
)

func publishWithDeduplication(js nats.JetStreamContext, subject string, data []byte) error {
    // Generate unique message ID
    msgID := uuid.New().String()

    // Publish with message ID for deduplication
    pubAck, err := js.Publish(subject, data,
        nats.MsgId(msgID),
        nats.ExpectStream("USER_EVENTS"),
        nats.AckWait(10*time.Second),
    )
    if err != nil {
        return fmt.Errorf("publish failed: %w", err)
    }

    // Check if message was deduplicated
    if pubAck.Duplicate {
        log.Printf("Message %s was deduplicated", msgID)
    } else {
        log.Printf("Message %s published: sequence=%d", msgID, pubAck.Sequence)
    }

    return nil
}
```

## Monitoring JetStream Performance

Monitor your JetStream deployment:

```bash
# Check stream status
kubectl exec -n nats-system nats-0 -- nats stream info USER_EVENTS

# List consumers
kubectl exec -n nats-system nats-0 -- nats consumer list USER_EVENTS

# Check consumer status
kubectl exec -n nats-system nats-0 -- nats consumer info USER_EVENTS user-event-processor

# Monitor metrics with Prometheus
kubectl port-forward -n nats-system svc/nats-metrics 7777:7777
```

## Best Practices

Design your subject namespace carefully. Use hierarchical subjects like "domain.entity.action" for flexible filtering. This allows consumers to subscribe to specific event types or all events from an entity.

Configure appropriate retention policies based on your use case. Use limits-based retention for high-volume streams and interest-based retention when events should persist only while consumers are active.

Set realistic acknowledgment timeouts. Balance between giving consumers enough time to process and detecting failures quickly. Use exponential backoff for retries.

Monitor consumer lag and stream storage. Set up alerts when consumers fall behind or storage approaches limits. Scale consumers horizontally when lag increases.

## Conclusion

NATS JetStream provides a lightweight yet powerful solution for event-driven architectures on Kubernetes. Its combination of high performance, reliability, and operational simplicity makes it an excellent choice for microservices communication. By following these patterns, you can build scalable systems that handle events reliably while maintaining the flexibility to add new consumers and processing logic without disrupting existing services.
