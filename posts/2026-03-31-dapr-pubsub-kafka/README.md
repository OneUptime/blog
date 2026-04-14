# How to Set Up Dapr Pub/Sub with Apache Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Kafka, Messaging, Event Streaming

Description: Configure Dapr pub/sub messaging with Apache Kafka as the broker for high-throughput, durable, partitioned event streaming between microservices.

---

## Why Use Kafka with Dapr Pub/Sub?

Apache Kafka provides durable, partitioned, replicated event streams with high throughput and long retention. It is the industry standard for event-driven architectures at scale. Dapr's Kafka pub/sub component wraps Kafka's producer and consumer APIs behind a simple, portable interface.

## Prerequisites

- Apache Kafka running (locally or in the cloud)
- Dapr CLI initialized
- Kafka topic created (or auto-create enabled)

## Starting Kafka for Local Development

Use Docker Compose to start Kafka with KRaft (no Zookeeper):

```yaml
# docker-compose.yml
version: '3'
services:
  kafka:
    image: bitnami/kafka:3.6
    ports:
      - "9092:9092"
    environment:
      - KAFKA_CFG_NODE_ID=0
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka:9093
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092
      - ALLOW_PLAINTEXT_LISTENER=yes
      - KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=true
```

Start Kafka:

```bash
docker-compose up -d
```

## Configuring the Kafka Pub/Sub Component

```yaml
# pubsub-kafka.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "localhost:9092"
  - name: consumerGroup
    value: "dapr-consumer-group"
  - name: clientID
    value: "dapr-kafka-client"
  - name: authType
    value: "none"
  - name: initialOffset
    value: "newest"
  - name: maxMessageBytes
    value: "1048576"
```

For self-hosted mode:

```bash
cp pubsub-kafka.yaml ~/.dapr/components/
```

### Kubernetes with SASL Auth

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker.default.svc.cluster.local:9092"
  - name: consumerGroup
    value: "myapp-consumer-group"
  - name: authType
    value: "password"
  - name: saslUsername
    secretKeyRef:
      name: kafka-secret
      key: username
  - name: saslPassword
    secretKeyRef:
      name: kafka-secret
      key: password
  - name: saslMechanism
    value: "SHA-256"
  - name: initialOffset
    value: "newest"
```

## Publisher Service

```python
# publisher.py
import os
import requests
import time
import json

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")

def publish_event(topic, data, metadata=None):
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/{topic}"
    headers = {"Content-Type": "application/json"}

    # Optionally set Kafka partition key via metadata
    if metadata:
        params = "&".join([f"metadata.{k}={v}" for k, v in metadata.items()])
        url = f"{url}?{params}"

    resp = requests.post(url, json=data, headers=headers)
    resp.raise_for_status()
    print(f"Published to {topic}: {data}")

# Publish order events
for i in range(1, 6):
    publish_event(
        topic="orders",
        data={"orderId": f"ORD-{i:04d}", "amount": i * 25.0},
        metadata={"partitionKey": f"customer-{i % 3}"}  # Kafka partition routing
    )
    time.sleep(0.1)
```

Start the publisher:

```bash
dapr run \
  --app-id kafka-publisher \
  --components-path ./components \
  --dapr-http-port 3500 \
  -- python publisher.py
```

## Subscriber Service

```python
# subscriber.py
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "route": "/handle-order",
            "metadata": {
                "rawPayload": "false"
            }
        }
    ])

@app.route('/handle-order', methods=['POST'])
def handle_order():
    cloud_event = request.get_json()
    order = cloud_event.get("data", {})
    print(f"Processing order: {order.get('orderId')} amount=${order.get('amount')}")

    # Acknowledge with SUCCESS
    return jsonify({"status": "SUCCESS"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
```

Start the subscriber:

```bash
dapr run \
  --app-id kafka-subscriber \
  --app-port 5001 \
  --components-path ./components \
  --dapr-http-port 3501 \
  -- python subscriber.py
```

## Setting Kafka Partition Key

To control which Kafka partition a message goes to, set the partition key via metadata:

```bash
curl -X POST \
  "http://localhost:3500/v1.0/publish/pubsub/orders?metadata.partitionKey=customer-42" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-007", "customerId": "customer-42"}'
```

Messages with the same partition key always go to the same partition, ensuring ordering per customer.

## Consuming from the Beginning

To replay all messages from the start of the topic:

```yaml
  - name: initialOffset
    value: "oldest"
```

## Advanced Kafka Configuration

```yaml
  - name: consumerFetchMin
    value: "1"
  - name: consumerFetchDefault
    value: "1048576"
  - name: sessionTimeout
    value: "10s"
  - name: heartbeatInterval
    value: "3s"
```

## Verifying with Kafka CLI

List topics and consume messages:

```bash
# List topics (Dapr creates a topic per subscription)
docker exec -it <kafka-container> kafka-topics.sh \
  --list --bootstrap-server localhost:9092

# Consume messages from the orders topic
docker exec -it <kafka-container> kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --from-beginning
```

## Summary

Dapr pub/sub with Apache Kafka provides durable, partitioned, high-throughput event streaming. Configure the `pubsub.kafka` component with broker addresses and a consumer group. Publishers optionally set partition keys via URL metadata for ordered delivery per key. Subscribers register routes via `/dapr/subscribe` and return `SUCCESS`, `RETRY`, or `DROP` to control acknowledgment. The Dapr API is identical to any other pub/sub component, making Kafka easy to swap in or out.
