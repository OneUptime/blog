# How to Use MongoDB Change Streams with Apache Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Apache Kafka, Change Stream, Event Streaming, Real-Time

Description: Learn how to stream MongoDB change events to Apache Kafka for real-time data pipelines using the MongoDB Kafka Connector.

---

## Overview

MongoDB Change Streams allow you to listen to changes in a collection, database, or entire deployment in real-time. Combining Change Streams with Apache Kafka enables you to build event-driven architectures where downstream services react to database changes asynchronously. The MongoDB Kafka Connector makes this integration seamless.

## Architecture

```text
MongoDB Replica Set
      |
  Change Stream
      |
MongoDB Kafka Source Connector
      |
  Apache Kafka Topic
      |
  Kafka Consumer(s)
      |
  Downstream Services
```

## Prerequisites

- MongoDB 4.0+ with replica set enabled
- Apache Kafka 2.6+
- Kafka Connect framework
- MongoDB Kafka Connector JAR

## Step 1 - Enable Replica Set on MongoDB

Change Streams require a replica set. Start MongoDB with replica set mode:

```bash
mongod --replSet rs0 --port 27017 --dbpath /data/db
```

Initialize the replica set:

```javascript
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "localhost:27017" }]
})
```

## Step 2 - Install the MongoDB Kafka Connector

Download and install the connector:

```bash
# Download connector
curl -O https://search.maven.org/remotecontent?filepath=org/mongodb/kafka/mongo-kafka-connect/1.11.0/mongo-kafka-connect-1.11.0-all.jar

# Copy to Kafka Connect plugins directory
cp mongo-kafka-connect-1.11.0-all.jar $KAFKA_HOME/plugins/
```

Or use Confluent Hub:

```bash
confluent-hub install mongodb/kafka-connect-mongodb:latest
```

## Step 3 - Configure the Source Connector

Create a connector configuration file:

```json
{
  "name": "mongodb-source-connector",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
    "connection.uri": "mongodb://localhost:27017/?replicaSet=rs0",
    "database": "ecommerce",
    "collection": "orders",
    "topic.prefix": "mongo",
    "change.stream.full.document": "updateLookup",
    "pipeline": "[{\"$match\": {\"operationType\": {\"$in\": [\"insert\", \"update\", \"delete\"]}}}]"
  }
}
```

Deploy the connector:

```bash
curl -X POST \
  http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @mongodb-source-connector.json
```

## Step 4 - Verify the Connector is Running

```bash
# Check connector status
curl http://localhost:8083/connectors/mongodb-source-connector/status

# List Kafka topics created
kafka-topics.sh --list --bootstrap-server localhost:9092 | grep mongo
```

## Step 5 - Consume Change Events from Kafka

Write a Kafka consumer to process MongoDB change events:

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    "mongo.ecommerce.orders",
    bootstrap_servers=["localhost:9092"],
    auto_offset_reset="earliest",
    group_id="order-processor",
    value_deserializer=lambda m: json.loads(m.decode("utf-8"))
)

for message in consumer:
    event = message.value
    operation = event.get("operationType")
    document = event.get("fullDocument")

    if operation == "insert":
        print(f"New order: {document['_id']} - Total: {document.get('total')}")
    elif operation == "update":
        print(f"Order updated: {document['_id']}")
    elif operation == "delete":
        print(f"Order deleted: {event['documentKey']['_id']}")
```

## Step 6 - Handle Resume Tokens

Kafka connectors automatically handle resume tokens for fault tolerance. Manually using Change Streams, store the resume token:

```javascript
// Save resume token to resume after restart
let resumeToken = null

const changeStream = db.collection("orders").watch([], {
  fullDocument: "updateLookup"
})

changeStream.on("change", (change) => {
  resumeToken = change._id
  // Process change...
  console.log("Operation:", change.operationType)
  console.log("Document:", change.fullDocument)
})

// Resume from a saved token
const resumedStream = db.collection("orders").watch([], {
  resumeAfter: resumeToken,
  fullDocument: "updateLookup"
})
```

## Step 7 - Add Filtering with Aggregation Pipelines

Filter which changes are published to Kafka:

```json
{
  "pipeline": "[{\"$match\": {\"$and\": [{\"operationType\": {\"$in\": [\"insert\", \"update\"]}}, {\"fullDocument.status\": \"pending\"}]}}]"
}
```

## Step 8 - Monitor the Pipeline

```bash
# Check connector lag (requires Kafka Connect 3.5+)
curl http://localhost:8083/connectors/mongodb-source-connector/offsets

# Kafka consumer group lag
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group order-processor
```

## Summary

Connecting MongoDB Change Streams to Apache Kafka via the MongoDB Kafka Connector creates a robust real-time data pipeline. The connector handles resume tokens automatically for fault tolerance, and you can filter specific operations using aggregation pipeline stages in the connector configuration. Downstream Kafka consumers can then process events independently without coupling to MongoDB.
