# How to Use Dapr Input Bindings to Trigger Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Input Binding, Trigger, Event-Driven, Integration

Description: Use Dapr input bindings to trigger your application from external systems like queues, storage events, cron schedules, and HTTP webhooks without writing broker-specific code.

---

## What Are Dapr Input Bindings?

Input bindings allow external systems to trigger your application by pushing events through the Dapr sidecar. Instead of writing custom polling or subscription code for each external system, you configure a binding component and implement an HTTP endpoint that Dapr calls when an event arrives.

Input bindings support sources like Kafka, AWS SQS, Azure Queue Storage, RabbitMQ, cron schedules, HTTP webhooks, and many more.

## How Input Bindings Work

```mermaid
flowchart LR
    E[External Source\ne.g. Kafka, Cron, SQS] -->|Event| Sidecar[Dapr Sidecar]
    Sidecar -->|POST /binding-name| App[Your Application]
    App -->|200 OK| Sidecar
    Sidecar -->|ACK| E
```

## Prerequisites

- Dapr initialized
- A binding component configured
- Your application exposes an HTTP endpoint matching the binding name

## Configuring an Input Binding (Kafka Example)

```yaml
# kafka-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-orders
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "localhost:9092"
  - name: topics
    value: "incoming-orders"
  - name: consumerGroup
    value: "binding-consumer-group"
  - name: authType
    value: "none"
  - name: direction
    value: "input"
```

## Handling Input Binding Events

Your application exposes an HTTP endpoint named after the binding:

```python
# app.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/kafka-orders', methods=['POST'])
def handle_kafka_order():
    # Dapr posts the event data directly as the request body
    order_data = request.get_json()
    print(f"Received binding event: {order_data}")

    if order_data:
        process_order(order_data)

    # Return 200 to acknowledge
    return jsonify({"success": True})

def process_order(order):
    print(f"Processing order: {order}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
```

Start with Dapr:

```bash
dapr run \
  --app-id order-processor \
  --app-port 5001 \
  --dapr-http-port 3500 \
  -- python app.py
```

## Input Binding Event Format

Dapr POSTs the event data directly as the request body to your endpoint. For example, a Kafka message containing JSON arrives as:

```json
{
  "orderId": "ORD-001",
  "amount": 99.99
}
```

Binding-specific metadata (such as the Kafka topic, partition, and offset) is passed via HTTP headers, not in the body.

## Node.js Handler

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// The route name matches the binding component name
app.post('/kafka-orders', (req, res) => {
  // Dapr posts the event data directly as the request body
  const order = req.body;
  console.log('Binding event received:', order);

  // Process the order
  processOrder(order);

  // Acknowledge by returning 200
  res.status(200).send();
});

function processOrder(order) {
  console.log(`Processing order ${order.orderId}: $${order.amount}`);
}

app.listen(3001, () => console.log('Listening on :3001'));
```

## Go Handler

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

type Order struct {
    OrderID string  `json:"orderId"`
    Amount  float64 `json:"amount"`
}

func main() {
    // Handler name matches binding component name
    http.HandleFunc("/kafka-orders", func(w http.ResponseWriter, r *http.Request) {
        // Dapr posts the event data directly as the request body
        var order Order
        json.NewDecoder(r.Body).Decode(&order)
        fmt.Printf("Binding event: %+v\n", order)

        // Acknowledge with 200
        w.WriteHeader(200)
    })

    log.Fatal(http.ListenAndServe(":3001", nil))
}
```

## AWS SQS Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqs-trigger
spec:
  type: bindings.aws.sqs
  version: v1
  metadata:
  - name: queueName
    value: "my-trigger-queue"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: direction
    value: "input"
```

## Azure Queue Storage Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-queue-trigger
spec:
  type: bindings.azure.storagequeues
  version: v1
  metadata:
  - name: accountName
    value: "mystorageaccount"
  - name: accountKey
    secretKeyRef:
      name: azure-storage-secret
      key: accessKey
  - name: queueName
    value: "trigger-queue"
  - name: direction
    value: "input"
```

## RabbitMQ Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-trigger
spec:
  type: bindings.rabbitmq
  version: v1
  metadata:
  - name: queueName
    value: "order-queue"
  - name: host
    value: "amqp://guest:guest@localhost:5672"
  - name: durable
    value: "true"
  - name: prefetchCount
    value: "10"
  - name: direction
    value: "input"
```

## Returning Binding Data

You can return data from your handler to send back to the binding source (if supported):

```python
@app.route('/kafka-orders', methods=['POST'])
def handle_kafka_order():
    order = request.get_json()

    result = process_order(order)

    # Return data back to the binding (optional)
    return jsonify({
        "data": {"processed": True, "orderId": result["orderId"]},
        "to": ["output-binding-name"]  # Optional: forward to output binding
    })
```

## Summary

Dapr input bindings decouple your application from external event sources by routing events through the sidecar to your HTTP endpoint. Name your endpoint after the binding component, return 200 to acknowledge, and non-200 responses trigger retry. This pattern works with Kafka, SQS, RabbitMQ, Azure Queue Storage, cron, HTTP webhooks, and many other sources with zero broker-specific code in your application.
