# How to Configure Kafka Consumer Group Settings for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kafka, Pub/Sub, Consumer Group, Messaging

Description: Configure Kafka consumer group settings in Dapr pub/sub components including group IDs, offset management, and partition assignment strategies.

---

## Overview

Dapr's Kafka pub/sub component wraps the IBM Sarama Go Kafka client and exposes key consumer group settings as component metadata. Tuning these settings affects throughput, latency, and message ordering guarantees.

## Basic Kafka Pub/Sub Component

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
    value: "kafka-broker:9092"
  - name: consumerGroup
    value: "my-app-consumer-group"
  - name: initialOffset
    value: "newest"
  - name: maxMessageBytes
    value: "1048576"
```

## Consumer Group ID Strategy

Use a consistent, app-specific consumer group ID to ensure each service instance shares offset tracking:

```yaml
  - name: consumerGroup
    value: "order-service-v2"
```

Multiple replicas of the same Dapr app automatically share the same consumer group, enabling horizontal scaling across topic partitions.

## Controlling Initial Offset

```yaml
  - name: initialOffset
    value: "oldest"   # Process all existing messages on first start
# OR
  - name: initialOffset
    value: "newest"   # Only process new messages after startup
```

## Setting Session and Heartbeat Timeouts

```yaml
  - name: sessionTimeout
    value: "10s"
  - name: heartbeatInterval
    value: "3s"
```

These control how quickly Kafka detects a dead consumer and triggers rebalancing. Keep `heartbeatInterval` at 1/3 of `sessionTimeout`.

## Configuring Fetch Settings for Throughput

```yaml
  - name: consumerFetchMin
    value: "1"
  - name: consumerFetchDefault
    value: "1048576"
  - name: channelBufferSize
    value: "512"
```

## Subscribing to Topics

In your application, subscribe using the Dapr subscription approach:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-subscription
spec:
  pubsubname: kafka-pubsub
  topic: orders
  routes:
    default: /orders
```

Handle messages in your service:

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

type Order struct {
    ID     string  `json:"id"`
    Amount float64 `json:"amount"`
}

func ordersHandler(w http.ResponseWriter, r *http.Request) {
    var event struct {
        Data Order `json:"data"`
    }
    json.NewDecoder(r.Body).Decode(&event)
    fmt.Printf("Processing order: %s\n", event.Data.ID)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
}
```

## Monitoring Consumer Lag

```bash
kubectl exec -it kafka-0 -- kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group order-service-v2
```

## Summary

Dapr's Kafka pub/sub component exposes consumer group ID, initial offset, session timeouts, and fetch settings as metadata. Set a descriptive, version-aware consumer group ID, tune session and heartbeat intervals to match your network conditions, and monitor consumer lag to detect processing bottlenecks before they cause cascading failures.
