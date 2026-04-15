# How to Configure Pub/Sub Acknowledgment Modes in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Acknowledgment, Messaging, Reliability

Description: Configure pub/sub acknowledgment modes in Dapr to control when messages are considered delivered and how failed deliveries are handled.

---

## Overview

Message acknowledgment determines when a broker marks a message as consumed. Dapr's pub/sub model uses HTTP response codes from subscribers to control acknowledgment, and some components expose additional ack modes through metadata.

## Default Acknowledgment Behavior

By default, Dapr acknowledges a message only after the subscriber returns HTTP 200 with a `SUCCESS` status:

```go
// Successful processing - message acknowledged
func handleMessage(w http.ResponseWriter, r *http.Request) {
    // ... process ...
    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
}

// Failed processing - message requeued for retry
func handleMessageWithRetry(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "RETRY"})
}

// Poison message - message dropped permanently
func dropMessage(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "DROP"})
}
```

## RabbitMQ Acknowledgment Configuration

For RabbitMQ, configure the ack wait timeout:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
  namespace: default
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: host
    value: "amqp://guest:guest@rabbitmq:5672"
  - name: requeueInFailure
    value: "true"
  - name: concurrencyMode
    value: "parallel"
```

## Kafka Commit Offset Strategy

Dapr commits Kafka offsets after successful subscriber acknowledgment:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: consumerGroup
    value: "order-service"
  - name: consumeRetryInterval
    value: "200ms"
  - name: consumeRetryEnabled
    value: "true"
```

## Controlling Concurrency Mode

For ordered processing (one message at a time per topic partition):

```yaml
  - name: concurrencyMode
    value: "single"
```

For maximum throughput (parallel processing):

```yaml
  - name: concurrencyMode
    value: "parallel"
```

## Async Acknowledgment Pattern

For long-running processing, use a background worker and respond quickly:

```go
var processingQueue = make(chan OrderEvent, 1000)

func handleOrder(w http.ResponseWriter, r *http.Request) {
    var event OrderEvent
    json.NewDecoder(r.Body).Decode(&event)

    // Non-blocking enqueue
    select {
    case processingQueue <- event:
        // Acknowledge immediately, process asynchronously
        w.WriteHeader(200)
        json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
    default:
        // Queue full, ask for retry
        w.WriteHeader(200)
        json.NewEncoder(w).Encode(map[string]string{"status": "RETRY"})
    }
}

func backgroundWorker() {
    for event := range processingQueue {
        processOrder(event)
    }
}
```

Note: Only use async ack when processing is idempotent, since a pod restart between ack and processing will cause message loss.

## Monitoring Unacknowledged Messages

```bash
# RabbitMQ unacknowledged count
curl -u guest:guest http://rabbitmq:15672/api/queues/%2F/orders | jq '.messages_unacknowledged'

# Kafka consumer lag (unprocessed = unacknowledged)
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --group order-service
```

## Summary

Dapr uses HTTP response statuses for acknowledgment: 200/SUCCESS acknowledges, 200/RETRY requeues, and 200/DROP discards. For RabbitMQ, configure `requeueInFailure`. For Kafka, Dapr commits offsets post-acknowledgment. Use `concurrencyMode: single` for ordered processing and monitor unacknowledged message counts as a key reliability metric.
