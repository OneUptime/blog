# How to Configure Azure Service Bus Session Support for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Service Bus, Pub/Sub, Session, Messaging

Description: Enable Azure Service Bus session support in Dapr pub/sub to guarantee ordered, FIFO message delivery for related message groups within a session.

---

## Overview

Azure Service Bus sessions enable grouped, ordered delivery of messages that share a session ID. This is essential for workflows where related messages must be processed in sequence - such as order state transitions or multi-step approvals.

## Enabling Session Support in the Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
  namespace: default
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: servicebus-secret
      key: connectionString
  - name: requireSessions
    value: "true"
  - name: maxActiveMessages
    value: "1000"
  - name: lockRenewalInSec
    value: "20"
  - name: timeoutInSec
    value: "60"
```

## Creating a Session-Enabled Topic and Subscription

```bash
# Create Service Bus namespace
az servicebus namespace create \
  --resource-group my-rg \
  --name my-servicebus-ns \
  --sku Standard

# Create topic
az servicebus topic create \
  --resource-group my-rg \
  --namespace-name my-servicebus-ns \
  --name orders

# Create session-enabled subscription
az servicebus topic subscription create \
  --resource-group my-rg \
  --namespace-name my-servicebus-ns \
  --topic-name orders \
  --name order-processor \
  --enable-session true \
  --max-delivery-count 5
```

## Publishing Messages with Session IDs

Pass the session ID as a metadata query parameter:

```bash
curl -X POST "http://localhost:3500/v1.0/publish/servicebus-pubsub/orders?metadata.SessionId=customer-456" \
  -H "Content-Type: application/json" \
  -d '{"step": "payment", "orderId": "789", "customerId": "456"}'

curl -X POST "http://localhost:3500/v1.0/publish/servicebus-pubsub/orders?metadata.SessionId=customer-456" \
  -H "Content-Type: application/json" \
  -d '{"step": "fulfillment", "orderId": "789", "customerId": "456"}'
```

Both messages with session ID `customer-456` are delivered in order to the same consumer.

## Go SDK Example for Session-Aware Publishing

```go
package main

import (
    dapr "github.com/dapr/go-sdk/client"
    "context"
)

func publishOrderStep(client dapr.Client, customerID, step string, data interface{}) error {
    return client.PublishEvent(
        context.Background(),
        "servicebus-pubsub",
        "orders",
        data,
        dapr.PublishEventWithMetadata(map[string]string{
            "SessionId": customerID,
        }),
    )
}
```

## Handling Session Messages in Your Subscriber

```go
func handleOrder(w http.ResponseWriter, r *http.Request) {
    var envelope struct {
        Data    OrderStep         `json:"data"`
        Metadata map[string]string `json:"metadata"`
    }
    json.NewDecoder(r.Body).Decode(&envelope)

    sessionID := envelope.Metadata["SessionId"]
    fmt.Printf("Processing step %s for session %s\n",
        envelope.Data.Step, sessionID)

    // Return SUCCESS to acknowledge
    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
}
```

## Session Lock Renewal

For long-running session processing, configure lock renewal:

```yaml
  - name: lockRenewalInSec
    value: "20"
  - name: timeoutInSec
    value: "300"
```

## Summary

Azure Service Bus sessions in Dapr guarantee ordered, grouped message delivery for related messages sharing a session ID. Enable sessions on both the Dapr component and the Service Bus subscription, publish with the `metadata.SessionId` query parameter, and configure lock renewal for long-running message handlers. Sessions are ideal for workflow state machines and ordered event streams.
