# How to Use the MongoDB Kafka Sink Connector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kafka, Connector, Sink, Event-Driven

Description: Learn how to configure the MongoDB Kafka Sink Connector to write Kafka topic messages into MongoDB collections for real-time data ingestion pipelines.

---

## Overview

The MongoDB Kafka Sink Connector reads messages from Kafka topics and writes them to MongoDB collections. This is the reverse of the Source Connector - it enables patterns like writing processed events, log aggregations, or analytics data from Kafka into MongoDB for storage and querying.

## Prerequisites

- Apache Kafka and Kafka Connect installed
- MongoDB running (standalone or replica set)
- MongoDB Kafka Connector installed on Kafka Connect workers

```bash
# Install connector plugin
confluent-hub install mongodb/kafka-connect-mongodb:latest
# Restart Kafka Connect after installation
sudo systemctl restart kafka-connect
```

## Basic Sink Connector Configuration

Create a sink connector configuration:

```json
{
  "name": "mongodb-sink-events",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
    "connection.uri": "mongodb://user:pass@mongo-host:27017/?replicaSet=rs0",
    "database": "analytics",
    "collection": "events",
    "topics": "app.events",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "key.converter.schemas.enable": "false",
    "value.converter.schemas.enable": "false"
  }
}
```

Deploy via the Kafka Connect REST API:

```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @mongodb-sink-config.json
```

## Write Mode Configuration

Control how the connector writes to MongoDB using `document.id.strategy` and `writemodel.strategy`:

```json
{
  "document.id.strategy": "com.mongodb.kafka.connect.sink.processor.id.strategy.UuidStrategy",
  "writemodel.strategy": "com.mongodb.kafka.connect.sink.writemodel.strategy.ReplaceOneBusinessKeyStrategy",
  "document.id.strategy.overwrite.existing": "true"
}
```

Available write model strategies:

```text
Write model strategies:
- InsertOneDefaultStrategy: insert new document (fails on duplicate _id)
- ReplaceOneDefaultStrategy: replace document by _id
- ReplaceOneBusinessKeyStrategy: replace by custom field(s)
- UpdateOneTimestampsStrategy: upsert with createdAt/updatedAt
- DeleteOneDefaultStrategy: delete document matching _id
```

## Use a Business Key for Upserts

To upsert documents using a business key instead of Kafka message key:

```json
{
  "writemodel.strategy": "com.mongodb.kafka.connect.sink.writemodel.strategy.ReplaceOneBusinessKeyStrategy",
  "document.id.strategy": "com.mongodb.kafka.connect.sink.processor.id.strategy.PartialValueStrategy",
  "document.id.strategy.partial.value.projection.list": "orderId",
  "document.id.strategy.partial.value.projection.type": "AllowList"
}
```

This configuration upserts documents where `orderId` matches, preventing duplicates on replay.

## Produce Test Messages to Kafka

```python
from kafka import KafkaProducer
import json, uuid
from datetime import datetime, timezone

producer = KafkaProducer(
  bootstrap_servers=["localhost:9092"],
  value_serializer=lambda v: json.dumps(v).encode("utf-8")
)

event = {
  "orderId": str(uuid.uuid4()),
  "userId": "u-123",
  "amount": 99.99,
  "status": "completed",
  "timestamp": datetime.now(timezone.utc).isoformat()
}

producer.send("app.events", value=event)
producer.flush()
print(f"Sent event: {event['orderId']}")
```

## Handle Errors and Dead Letter Queue

Configure error handling to send failed records to a dead letter queue instead of stopping the connector:

```json
{
  "errors.tolerance": "all",
  "errors.deadletterqueue.topic.name": "mongodb-sink-dlq",
  "errors.deadletterqueue.context.headers.enable": "true",
  "errors.log.enable": "true",
  "errors.log.include.messages": "true"
}
```

## Monitor Sink Connector

```bash
# Check connector status
curl http://localhost:8083/connectors/mongodb-sink-events/status | jq

# Check connector metrics via JMX or Confluent Control Center
# Key metrics to monitor:
# - kafka.connect:connector=mongodb-sink-events,task=sink-task-0 (records written)
# - Error rate from dead letter queue topic message count
```

## Summary

The MongoDB Kafka Sink Connector provides a scalable, fault-tolerant way to ingest Kafka messages into MongoDB. Use `ReplaceOneBusinessKeyStrategy` with a business key field to safely handle message replays and at-least-once delivery semantics. Configure a dead letter queue for error handling and monitor both connector status and DLQ topic lag in production.
