# How to Use the MongoDB Kafka Source Connector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kafka, Connector, Change Stream, Event-Driven

Description: Learn how to configure the MongoDB Kafka Source Connector to stream MongoDB change events into Kafka topics for real-time data pipelines.

---

## Overview

The MongoDB Kafka Source Connector (part of the MongoDB Connector for Apache Kafka) reads change events from MongoDB change streams and publishes them to Kafka topics. This enables real-time data pipelines where downstream services react to MongoDB writes without polling.

## Prerequisites

You need:
- MongoDB 4.0+ running as a replica set (change streams require a replica set)
- Apache Kafka and Kafka Connect running
- MongoDB Kafka Connector JAR installed in Kafka Connect

```bash
# Install the MongoDB Kafka Connector using Confluent Hub
confluent-hub install mongodb/kafka-connect-mongodb:latest
# or manually download from https://www.mongodb.com/kafka-connector
```

## Basic Source Connector Configuration

Create a connector configuration file:

```json
{
  "name": "mongodb-source-orders",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
    "connection.uri": "mongodb://user:pass@mongo-host:27017/?replicaSet=rs0",
    "database": "mydb",
    "collection": "orders",
    "topic.prefix": "mongo",
    "startup.mode": "latest",
    "change.stream.full.document": "updateLookup",
    "output.format.value": "json",
    "output.json.formatter": "com.mongodb.kafka.connect.source.json.formatter.SimplifiedJson"
  }
}
```

Deploy the connector via Kafka Connect REST API:

```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @mongodb-source-config.json
```

## Kafka Topic Naming

By default, the connector publishes to a topic named `{prefix}.{database}.{collection}`:

```text
Configuration: topic.prefix=mongo, database=mydb, collection=orders
Kafka topic: mongo.mydb.orders
```

Change events for insert, update, replace, and delete all go to the same topic with an `operationType` field.

## Configure Full Document on Update

By default, MongoDB update change events include only the diff (`updateDescription`). Use `updateLookup` to include the full updated document:

```json
{
  "change.stream.full.document": "updateLookup",
  "change.stream.full.document.before.change": "whenAvailable"
}
```

This requires `changeStreamPreAndPostImages` enabled on the collection:

```javascript
// Enable pre/post images on the collection
db.runCommand({
  collMod: "orders",
  changeStreamPreAndPostImages: { enabled: true }
});
```

## Filter Events with Pipeline

Use a MongoDB aggregation pipeline to filter which change events are published to Kafka:

```json
{
  "pipeline": "[{\"$match\": {\"operationType\": {\"$in\": [\"insert\", \"update\"]}, \"fullDocument.status\": \"completed\"}}]"
}
```

## Consume Events from Kafka

Read the change events from Kafka using any Kafka consumer:

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
  "mongo.mydb.orders",
  bootstrap_servers=["localhost:9092"],
  value_deserializer=lambda m: json.loads(m.decode("utf-8")),
  auto_offset_reset="latest"
)

for message in consumer:
  event = message.value
  print(f"Operation: {event['operationType']}, OrderId: {event.get('fullDocument', {}).get('_id')}")
```

## Monitor Connector Status

```bash
# Check connector status
curl http://localhost:8083/connectors/mongodb-source-orders/status

# Expected output
{
  "name": "mongodb-source-orders",
  "connector": { "state": "RUNNING", "worker_id": "connect-host:8083" },
  "tasks": [{ "id": 0, "state": "RUNNING" }]
}
```

## Summary

The MongoDB Kafka Source Connector is a reliable, production-ready way to stream MongoDB change events into Kafka. Configure `change.stream.full.document: updateLookup` to include full documents on updates, use pipeline filters to reduce event volume, and monitor connector status via the Kafka Connect REST API. This pattern powers event-driven architectures where multiple downstream services consume MongoDB changes independently.
