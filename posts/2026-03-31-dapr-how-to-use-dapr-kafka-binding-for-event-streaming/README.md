# How to Use Dapr Kafka Binding for Event Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kafka, Event Streaming, Binding, Microservice

Description: Learn how to use the Dapr Kafka binding to produce and consume messages from Apache Kafka topics without managing Kafka client libraries directly.

---

## What Is the Dapr Kafka Binding

Dapr provides both input and output bindings for Apache Kafka. The output binding lets your application produce messages to a Kafka topic, while the input binding triggers your application when a message arrives on a topic. Unlike Dapr pub/sub (which abstracts the broker), bindings give you direct, lower-level access to Kafka semantics like partitions and offsets.

## Prerequisites

- Dapr CLI installed
- A running Apache Kafka cluster (local or remote)
- Basic familiarity with Kafka concepts

## Define the Kafka Binding Component

For producing messages (output binding):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-producer
  namespace: default
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "localhost:9092"
  - name: publishTopic
    value: "orders"
  - name: authType
    value: "none"
```

For consuming messages (input binding) - same component type, add `consumerGroup`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-consumer
  namespace: default
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "localhost:9092"
  - name: topics
    value: "orders"
  - name: consumerGroup
    value: "my-consumer-group"
  - name: authType
    value: "none"
  - name: initialOffset
    value: "newest"
```

## Produce Messages with the Output Binding

Use the Dapr sidecar API to send a message to Kafka:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/kafka-producer \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderId": "abc123",
      "amount": 99.99,
      "currency": "USD"
    },
    "metadata": {
      "key": "abc123",
      "partition": "0"
    },
    "operation": "create"
  }'
```

The `metadata.key` sets the Kafka message key, which controls partition routing.

## Produce Messages Using the Node.js SDK

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function publishOrder(order) {
  await client.binding.send(
    'kafka-producer',
    'create',
    order,
    { key: order.orderId }
  );
  console.log('Order published to Kafka:', order.orderId);
}

publishOrder({ orderId: 'abc123', amount: 99.99, currency: 'USD' });
```

## Consume Messages via Input Binding

When the Kafka input binding component is defined, Dapr calls your application with an HTTP POST to an endpoint named after the component:

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/kafka-consumer")
async def handle_kafka_message(request: Request):
    body = await request.json()
    print("Received Kafka message:", body)

    # Extract message metadata
    headers = request.headers
    partition = headers.get("X-Kafka-Partition", "unknown")
    offset = headers.get("X-Kafka-Offset", "unknown")
    key = headers.get("X-Kafka-Key", "")

    print(f"Partition: {partition}, Offset: {offset}, Key: {key}")

    # Process the message
    await process_order(body)

    return {"status": "processed"}

async def process_order(order):
    print(f"Processing order: {order.get('orderId')}")
```

## Configure SASL Authentication

For production Kafka clusters that require authentication:

```yaml
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka.production.example.com:9093"
  - name: topics
    value: "orders"
  - name: authType
    value: "password"
  - name: saslUsername
    value: "my-kafka-user"
  - name: saslPassword
    secretKeyRef:
      name: kafka-secrets
      key: password
  - name: saslMechanism
    value: "SCRAM-SHA-256"
  - name: enableTLS
    value: "true"
```

## Handle Multiple Topics

To consume from multiple topics, separate them with commas:

```yaml
  - name: topics
    value: "orders,payments,shipments"
```

Your handler receives all messages on the same endpoint. Use the `X-Kafka-Topic` header to route accordingly:

```javascript
app.post('/kafka-consumer', (req, res) => {
  const topic = req.headers['x-kafka-topic'];
  const message = req.body;

  switch (topic) {
    case 'orders':
      handleOrder(message);
      break;
    case 'payments':
      handlePayment(message);
      break;
    default:
      console.log('Unknown topic:', topic);
  }

  res.status(200).send('OK');
});
```

## Summary

The Dapr Kafka binding provides a straightforward way to produce and consume Kafka messages without embedding Kafka client libraries in your services. Output bindings let you publish messages with a simple API call, while input bindings trigger your HTTP endpoints when new messages arrive. This approach keeps your application code decoupled from Kafka configuration details and works uniformly across self-hosted and Kubernetes environments.
