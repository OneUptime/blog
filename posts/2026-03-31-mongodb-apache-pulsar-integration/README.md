# How to Use MongoDB with Apache Pulsar

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Pulsar, Messaging, Event-Driven, Streaming

Description: Learn how to integrate MongoDB with Apache Pulsar to stream change events and build event-driven pipelines using Pulsar IO connectors and change streams.

---

## Overview

Apache Pulsar is a cloud-native, multi-tenant messaging and streaming platform. Integrating MongoDB with Pulsar enables event-driven architectures where MongoDB changes flow into Pulsar topics for downstream processing, or Pulsar messages are persisted to MongoDB for durable storage.

## Pulsar MongoDB Connector Overview

Apache Pulsar provides official MongoDB connectors via Pulsar IO:
- **MongoDB Source**: reads change events from MongoDB change streams and publishes to Pulsar
- **MongoDB Sink**: reads messages from Pulsar topics and writes to MongoDB

```bash
# Download MongoDB Pulsar connector
wget https://archive.apache.org/dist/pulsar/pulsar-3.0.0/connectors/pulsar-io-mongo-3.0.0.nar
# Copy to Pulsar connectors directory
cp pulsar-io-mongo-3.0.0.nar $PULSAR_HOME/connectors/
```

## Configure MongoDB Source Connector

Create a source connector configuration to stream MongoDB changes to Pulsar:

```yaml
# mongodb-source.yaml
tenant: public
namespace: default
name: mongodb-source
topicName: persistent://public/default/mongodb-orders
archive: builtin://mongo
parallelism: 1
configs:
  mongoUri: "mongodb://user:pass@mongo-host:27017/?replicaSet=rs0"
  database: "mydb"
  collection: "orders"
  batchSize: 100
  batchTimeMs: 1000
```

Deploy the source connector:

```bash
bin/pulsar-admin source create \
  --source-config-file mongodb-source.yaml
```

## Consume MongoDB Change Events from Pulsar

Read the change events published by the MongoDB Source Connector:

```python
import pulsar, json

client = pulsar.Client("pulsar://localhost:6650")
consumer = client.subscribe(
  "persistent://public/default/mongodb-orders",
  subscription_name="order-processor",
  consumer_type=pulsar.ConsumerType.Shared
)

while True:
  msg = consumer.receive()
  try:
    data = json.loads(msg.data().decode("utf-8"))
    print(f"Op: {data.get('operationType')}, Doc: {data.get('fullDocument', {}).get('_id')}")
    consumer.acknowledge(msg)
  except Exception as e:
    consumer.negative_acknowledge(msg)
    print(f"Error: {e}")
```

## Configure MongoDB Sink Connector

Write Pulsar messages to MongoDB:

```yaml
# mongodb-sink.yaml
tenant: public
namespace: default
name: mongodb-sink
inputs:
  - persistent://public/default/processed-events
archive: builtin://mongo
parallelism: 1
configs:
  mongoUri: "mongodb://user:pass@mongo-host:27017"
  database: "analytics"
  collection: "processed_events"
  batchSize: 200
  batchTimeMs: 2000
```

```bash
bin/pulsar-admin sink create \
  --sink-config-file mongodb-sink.yaml
```

## Publish Events to Pulsar and Persist to MongoDB

For custom pipelines, use the Pulsar Python client to produce messages:

```python
import pulsar, json, uuid
from datetime import datetime, timezone

client = pulsar.Client("pulsar://localhost:6650")
producer = client.create_producer("persistent://public/default/app-events")

event = {
  "eventId": str(uuid.uuid4()),
  "type": "order_shipped",
  "orderId": "o-001",
  "timestamp": datetime.now(timezone.utc).isoformat()
}

producer.send(json.dumps(event).encode("utf-8"))
print(f"Published: {event['eventId']}")
producer.close()
client.close()
```

The MongoDB Sink Connector will persist this message to MongoDB automatically.

## Monitor Connectors

```bash
# Check source connector status
bin/pulsar-admin source status --name mongodb-source

# Check sink connector status
bin/pulsar-admin sink status --name mongodb-sink

# Monitor topic stats
bin/pulsar-admin topics stats persistent://public/default/mongodb-orders
```

## Schema Registry Integration

Use Pulsar Schema Registry to enforce event schemas:

```python
from pulsar.schema import Record, String, Double, AvroSchema

# Define schema as a Record subclass
class OrderEvent(Record):
    orderId = String()
    status = String()
    total = Double()

producer = client.create_producer(
  "persistent://public/default/mongodb-orders",
  schema=AvroSchema(OrderEvent)
)
```

## Summary

Apache Pulsar integrates with MongoDB via official Pulsar IO connectors for both source (MongoDB to Pulsar) and sink (Pulsar to MongoDB) directions. The MongoDB Source Connector uses change streams to stream change events in real time, while the Sink Connector efficiently batches Pulsar messages into MongoDB. This combination enables scalable event-driven pipelines with strong durability and multi-topic fanout support.
