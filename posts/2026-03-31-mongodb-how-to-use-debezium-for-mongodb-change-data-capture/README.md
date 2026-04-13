# How to Use Debezium for MongoDB Change Data Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Debezium, Change Data Capture, Kafka Connect, Event Streaming

Description: Learn how to set up Debezium as a MongoDB CDC connector to capture and stream database changes to Kafka for event-driven architectures.

---

## Overview

Debezium is an open-source Change Data Capture (CDC) platform that uses MongoDB Change Streams to capture every insert, update, and delete event. In Debezium 2.x, the connector exclusively uses the Change Streams API (which internally builds on the oplog) to stream database changes to Kafka topics for event-driven architectures.

## Architecture

```text
MongoDB Change Streams (replica set)
        |
  Debezium MongoDB Connector
        |
    Kafka Connect
        |
  Apache Kafka Topics
        |
  Consumers / Sink Connectors
```

## Prerequisites

- MongoDB 4.0+ replica set
- Apache Kafka 2.6+
- Kafka Connect
- Debezium MongoDB Connector 2.x

## Step 1 - Set Up MongoDB Replica Set

Debezium requires a replica set to use Change Streams:

```bash
mongod --replSet rs0 --port 27017 --dbpath /data/db --logpath /var/log/mongodb/mongod.log
```

```javascript
rs.initiate()
rs.status()
```

## Step 2 - Create a MongoDB User for Debezium

```javascript
use admin
db.createUser({
  user: "debezium",
  pwd: "debezium-secret",
  roles: [
    { role: "read", db: "local" },
    { role: "readAnyDatabase", db: "admin" }
  ]
})
```

## Step 3 - Install the Debezium MongoDB Connector

```bash
# Download Debezium connector plugin
curl -O https://repo1.maven.org/maven2/io/debezium/debezium-connector-mongodb/2.4.2.Final/debezium-connector-mongodb-2.4.2.Final-plugin.tar.gz
tar -xzf debezium-connector-mongodb-2.4.2.Final-plugin.tar.gz
cp -r debezium-connector-mongodb/ $KAFKA_HOME/plugins/
```

Restart Kafka Connect to load the new plugin.

## Step 4 - Configure the Debezium Connector

```json
{
  "name": "debezium-mongodb-connector",
  "config": {
    "connector.class": "io.debezium.connector.mongodb.MongoDbConnector",
    "mongodb.connection.string": "mongodb://debezium:debezium-secret@localhost:27017/?replicaSet=rs0",
    "topic.prefix": "dbz",
    "database.include.list": "inventory",
    "collection.include.list": "inventory.products,inventory.orders",
    "capture.mode": "change_streams_update_full",
    "snapshot.mode": "initial"
  }
}
```

Deploy via Kafka Connect REST API:

```bash
curl -X POST \
  http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @debezium-mongodb-connector.json
```

## Step 5 - Understand the Debezium Event Format

Debezium produces events with a specific envelope format:

```json
{
  "schema": { "...": "schema definition" },
  "payload": {
    "before": null,
    "after": "{\"_id\": {\"$oid\": \"abc123\"}, \"name\": \"Widget\", \"price\": 9.99}",
    "source": {
      "version": "2.4.2.Final",
      "connector": "mongodb",
      "name": "dbz",
      "ts_ms": 1711900000000,
      "db": "inventory",
      "collection": "products",
      "ord": 1,
      "lsid": null,
      "txnNumber": null
    },
    "op": "c",
    "ts_ms": 1711900000100
  }
}
```

Operation types: `c` (create), `u` (update), `d` (delete), `r` (read/snapshot).

## Step 6 - Consume and Process CDC Events

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    "dbz.inventory.products",
    bootstrap_servers=["localhost:9092"],
    group_id="inventory-sync",
    value_deserializer=lambda m: json.loads(m.decode("utf-8"))
)

for msg in consumer:
    payload = msg.value.get("payload", {})
    op = payload.get("op")
    after = json.loads(payload.get("after", "{}")) if payload.get("after") else None
    before = json.loads(payload.get("before", "{}")) if payload.get("before") else None

    if op == "c":
        print(f"INSERT: {after}")
    elif op == "u":
        print(f"UPDATE: {after}")
    elif op == "d":
        print(f"DELETE doc key from before field")
    elif op == "r":
        print(f"SNAPSHOT: {after}")
```

## Step 7 - Use a Kafka Sink Connector for Data Sync

Pipe changes to a PostgreSQL database using the Debezium JDBC Sink:

```json
{
  "name": "postgres-sink",
  "config": {
    "connector.class": "io.debezium.connector.jdbc.JdbcSinkConnector",
    "tasks.max": "1",
    "topics": "dbz.inventory.products",
    "connection.url": "jdbc:postgresql://localhost:5432/targetdb",
    "connection.username": "postgres",
    "connection.password": "secret",
    "insert.mode": "upsert",
    "primary.key.mode": "record_key",
    "schema.evolution": "basic"
  }
}
```

## Step 8 - Monitor Connector Health

```bash
# Check connector status
curl http://localhost:8083/connectors/debezium-mongodb-connector/status | python3 -m json.tool

# View committed offsets
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic __consumer_offsets \
  --formatter kafka.coordinator.group.GroupMetadataManager\$OffsetsMessageFormatter
```

## Summary

Debezium for MongoDB CDC captures every change via Change Streams and publishes structured events to Kafka topics. The connector supports initial snapshots, multiple change stream capture modes, and fine-grained collection filtering. Downstream consumers can process these events to sync data to other databases, invalidate caches, or trigger business workflows.
