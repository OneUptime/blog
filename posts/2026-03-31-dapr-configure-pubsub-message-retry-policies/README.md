# How to Configure Pub/Sub Message Retry Policies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Retry, Resiliency, Messaging

Description: Configure message retry policies for Dapr pub/sub subscriptions using the Resiliency API to handle transient subscriber failures and dead letter routing.

---

## Overview

When a subscriber returns an error or times out, Dapr can retry delivery automatically. Combined with dead letter topics, you can build resilient message processing pipelines that never silently drop messages.

## Resiliency Policy for Pub/Sub

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: pubsub-resiliency
  namespace: default
spec:
  policies:
    retries:
      pubsubRetry:
        policy: exponential
        duration: 2s
        maxInterval: 30s
        maxRetries: 5
    timeouts:
      pubsubTimeout: 10s
  targets:
    components:
      kafka-pubsub:
        inbound:
          retry: pubsubRetry
          timeout: pubsubTimeout
```

## Subscriber Return Codes

Control retry behavior by returning specific status codes from your handler:

```go
package main

import (
    "encoding/json"
    "net/http"
)

func handleOrder(w http.ResponseWriter, r *http.Request) {
    var event map[string]interface{}
    json.NewDecoder(r.Body).Decode(&event)

    if err := processOrder(event); err != nil {
        // Tell Dapr to retry
        w.WriteHeader(200)
        json.NewEncoder(w).Encode(map[string]string{"status": "RETRY"})
        return
    }

    // Acknowledge success - no retry
    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
}

func handlePoisonOrder(w http.ResponseWriter, r *http.Request) {
    // Drop the message permanently - no retry
    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "DROP"})
}
```

## Dead Letter Topic Configuration

Route messages that exhaust retries to a dead letter topic:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: kafka-pubsub
  topic: orders
  deadLetterTopic: orders-dlq
  routes:
    default: /handle-order
```

## Dead Letter Handler

```go
func handleDeadLetter(w http.ResponseWriter, r *http.Request) {
    var event struct {
        Data     json.RawMessage   `json:"data"`
        Metadata map[string]string `json:"metadata"`
    }
    json.NewDecoder(r.Body).Decode(&event)

    // Log to alerting system
    fmt.Printf("Dead letter message: %s\n", string(event.Data))
    // Store for manual review
    saveToDeadLetterStore(event.Data)

    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
}
```

Register the dead letter handler:

```go
http.HandleFunc("/orders-dlq", handleDeadLetter)
```

## Bulk Subscribe with Retry Control

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-bulk-sub
spec:
  pubsubname: kafka-pubsub
  topic: orders
  routes:
    default: /handle-orders-bulk
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 1000
```

## Monitoring Retry Metrics

```bash
# Prometheus query for failed delivery rates (triggers retries)
rate(dapr_component_pubsub_ingress_count{app_id="order-service",success="false"}[5m])

# Dead letter queue depth (Kafka)
kubectl exec -it kafka-0 -- kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe --group order-service-dlq
```

## Summary

Dapr pub/sub retry policies use the Resiliency API to automatically retry failed message deliveries with exponential backoff. Subscribers signal retry or drop intent via the `status` response field. Configure dead letter topics to capture exhausted messages for manual review, and monitor retry metrics to identify systematic processing failures early.
