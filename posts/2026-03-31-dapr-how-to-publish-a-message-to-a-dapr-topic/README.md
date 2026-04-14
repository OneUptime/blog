# How to Publish a Message to a Dapr Topic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Messaging, Kubernetes, Microservice

Description: Learn how to publish messages to Dapr pub/sub topics using the HTTP and gRPC APIs, Dapr SDKs, and configure message metadata and delivery guarantees.

---

## How Dapr Pub/Sub Publishing Works

When you publish a message in Dapr, the sidecar receives it and forwards it to the configured message broker (Kafka, Redis, RabbitMQ, etc.). Your application doesn't need to know which broker is being used - it just calls the Dapr API.

The publish API endpoint is:

```text
POST http://localhost:3500/v1.0/publish/{pubsubName}/{topicName}
```

## Prerequisites

Deploy a pub/sub component. For Redis Streams:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master.default.svc.cluster.local:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: redis-password
```

Apply:

```bash
kubectl apply -f pubsub.yaml
```

## Publishing with HTTP API

Using curl:

```bash
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123", "item": "book", "quantity": 1}'
```

Using Python with requests:

```python
import requests
import json

dapr_port = 3500
pubsub_name = "pubsub"
topic_name = "orders"

message = {
    "orderId": "123",
    "item": "book",
    "quantity": 1,
    "userId": "user-456"
}

response = requests.post(
    f"http://localhost:{dapr_port}/v1.0/publish/{pubsub_name}/{topic_name}",
    json=message
)

if response.status_code == 204:
    print("Message published successfully")
else:
    print(f"Failed: {response.status_code} - {response.text}")
```

## Publishing with the Dapr Python SDK

```python
import json
from dapr.clients import DaprClient

with DaprClient() as client:
    result = client.publish_event(
        pubsub_name="pubsub",
        topic_name="orders",
        data=json.dumps({"orderId": "123", "item": "book"}),
        data_content_type="application/json"
    )
    print(f"Published: {result}")
```

## Publishing with the Dapr Go SDK

```go
package main

import (
    "context"
    "encoding/json"
    dapr "github.com/dapr/go-sdk/client"
)

type Order struct {
    OrderID  string `json:"orderId"`
    Item     string `json:"item"`
    Quantity int    `json:"quantity"`
}

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        panic(err)
    }
    defer client.Close()

    order := Order{
        OrderID:  "123",
        Item:     "book",
        Quantity: 1,
    }

    data, _ := json.Marshal(order)
    err = client.PublishEvent(context.Background(), "pubsub", "orders", data)
    if err != nil {
        panic(err)
    }
}
```

## Publishing with Metadata

Add metadata headers to control message behavior:

```bash
curl -X POST "http://localhost:3500/v1.0/publish/pubsub/orders?metadata.partitionKey=user-456&metadata.ttlInSeconds=3600" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123"}'
```

In Python:

```python
response = requests.post(
    f"http://localhost:3500/v1.0/publish/pubsub/orders",
    headers={
        "Content-Type": "application/json"
    },
    params={
        "metadata.partitionKey": "user-456",
        "metadata.ttlInSeconds": "3600"
    },
    json={"orderId": "123"}
)
```

## Publishing Multiple Messages (Bulk Publish)

For high-throughput scenarios, use the bulk publish API:

```bash
curl -X POST http://localhost:3500/v1.0/publish/bulk/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '[
    {"entryId": "1", "event": {"orderId": "101"}, "contentType": "application/json"},
    {"entryId": "2", "event": {"orderId": "102"}, "contentType": "application/json"},
    {"entryId": "3", "event": {"orderId": "103"}, "contentType": "application/json"}
  ]'
```

## Verifying Publication

Enable Dapr's debug logging to see publish activity:

```bash
kubectl logs <your-pod-name> -c daprd | grep -i publish
```

Expected log entry:

```text
time="2026-03-31T10:00:00Z" level=debug msg="Published event successfully: orders"
```

## Handling Publish Errors

Always handle non-204 responses:

```python
response = requests.post(
    "http://localhost:3500/v1.0/publish/pubsub/orders",
    json=message,
    timeout=5
)

if response.status_code != 204:
    # Retry or dead-letter the message
    raise Exception(f"Publish failed: {response.status_code} - {response.text}")
```

## Summary

Publishing to a Dapr topic uses a simple HTTP POST to `localhost:3500/v1.0/publish/{pubsubName}/{topicName}`. Dapr SDKs for Python, Go, Java, and .NET provide typed clients for cleaner code. Add metadata headers for partition keys and TTLs, and use the bulk publish API for high-throughput message pipelines. Always handle non-204 responses to ensure messages are not silently dropped.
