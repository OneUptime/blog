# How to Use Dapr RocketMQ Binding for Messaging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, RocketMQ, Messaging, Microservice

Description: Learn how to configure the Dapr RocketMQ binding to send messages to Apache RocketMQ topics and queues from Dapr-enabled microservices.

---

## Overview of Apache RocketMQ with Dapr

Apache RocketMQ is a distributed messaging platform widely used in Chinese tech companies and enterprise systems. It offers high throughput, low latency, and strong ordering guarantees. The Dapr RocketMQ binding lets any service publish messages to RocketMQ without managing RocketMQ client connections.

## Start RocketMQ Locally

```bash
docker run -d \
  --name rocketmq-namesrv \
  -p 9876:9876 \
  apache/rocketmq:latest \
  sh mqnamesrv

docker run -d \
  --name rocketmq-broker \
  -p 10909:10909 \
  -p 10911:10911 \
  -e "NAMESRV_ADDR=host.docker.internal:9876" \
  apache/rocketmq:latest \
  sh mqbroker -n host.docker.internal:9876 autoCreateTopicEnable=true
```

## Configure the RocketMQ Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rocketmq-binding
spec:
  type: bindings.rocketmq
  version: v1
  metadata:
  - name: nameServer
    value: localhost:9876
  - name: consumerGroup
    value: order-producer-group
  - name: topics
    value: ORDERS
  - name: accessKey
    secretKeyRef:
      name: rocketmq-secret
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: rocketmq-secret
      key: secretKey
  - name: retries
    value: "3"
```

## Send a Message

```bash
curl -X POST http://localhost:3500/v1.0/bindings/rocketmq-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "orderId": "order-1001",
      "customerId": "cust-123",
      "total": 299.99,
      "status": "created"
    }
  }'
```

## Send a Tagged Message

RocketMQ supports message tags for server-side filtering within a topic:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/rocketmq-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {"orderId": "order-1002", "status": "shipped"},
    "metadata": {
      "rocketmq-tag": "ShippedOrder",
      "rocketmq-key": "order-1002"
    }
  }'
```

## Application Code for Sending Messages

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

type Message struct {
    OrderID    string  `json:"orderId"`
    CustomerID string  `json:"customerId"`
    Total      float64 `json:"total"`
}

func publishOrder(msg Message) error {
    payload := map[string]interface{}{
        "operation": "create",
        "data":      msg,
        "metadata": map[string]string{
            "rocketmq-tag": "NewOrder",
            "rocketmq-key": msg.OrderID,
        },
    }
    body, _ := json.Marshal(payload)
    resp, err := http.Post(
        "http://localhost:3500/v1.0/bindings/rocketmq-binding",
        "application/json",
        bytes.NewReader(body),
    )
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    return nil
}
```

## Receiving Messages (Input Binding)

Configure as an input binding to have Dapr push messages to your app:

```javascript
app.post("/rocketmq-binding", async (req, res) => {
  const order = req.body;
  console.log("Received order from RocketMQ:", order.orderId);
  await fulfillOrder(order);
  res.sendStatus(200);
});
```

## Message Filtering with Tags and Keys

RocketMQ supports server-side filtering using tags and message identification using keys. Use the `rocketmq-tag` and `rocketmq-key` metadata fields to set these on outbound messages:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/rocketmq-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {"orderId": "order-1003", "event": "payment"},
    "metadata": {
      "rocketmq-tag": "PaymentEvent",
      "rocketmq-key": "order-1003"
    }
  }'
```

## Summary

The Dapr RocketMQ binding provides a standard interface for sending messages to Apache RocketMQ. Configure the name server address, consumer group, and authentication in the component YAML, then use tags and keys for filtering and message identification. This enables polyglot services to integrate with RocketMQ infrastructure without RocketMQ client SDKs.
