# How to Use Change Streams with the Kafka Connector for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kafka, Change Stream, CDC, Connector

Description: Configure the MongoDB Kafka Source Connector to stream Change Stream events into Kafka topics for real-time CDC pipelines and downstream integrations.

---

The MongoDB Kafka Connector (provided by MongoDB) uses Change Streams under the hood to capture every insert, update, replace, and delete from a MongoDB collection and publish them as messages to a Kafka topic. This turns MongoDB into a reliable event source for CDC (Change Data Capture) pipelines.

## Prerequisites

- Apache Kafka with Kafka Connect running
- MongoDB 4.0+ replica set or sharded cluster
- MongoDB Kafka Connector JAR (available from Maven or Confluent Hub)

## Installing the Connector

Using Confluent Hub CLI:

```bash
confluent-hub install mongodb/kafka-connect-mongodb:latest
```

Or download the JAR manually and place it in the Kafka Connect plugins directory:

```bash
cp mongodb-kafka-connect-mongodb-*.jar /usr/share/java/kafka/
```

Restart Kafka Connect after installing.

## Source Connector Configuration

Create a connector configuration file `mongodb-source.json`:

```json
{
  "name": "mongodb-source-orders",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
    "connection.uri": "mongodb+srv://user:pass@cluster.mongodb.net",
    "database": "shop",
    "collection": "orders",
    "topic.prefix": "mongo",
    "publish.full.document.only": "true",
    "change.stream.full.document": "updateLookup",
    "pipeline": "[{\"$match\":{\"operationType\":{\"$in\":[\"insert\",\"update\",\"replace\"]}}}]",
    "output.format.value": "json",
    "output.json.formatter": "com.mongodb.kafka.connect.source.json.formatter.SimplifiedJson",
    "copy.existing": "false"
  }
}
```

Register the connector via the Kafka Connect REST API:

```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @mongodb-source.json
```

## Verifying the Connector

```bash
# Check connector status
curl http://localhost:8083/connectors/mongodb-source-orders/status

# Consume messages from the Kafka topic
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic mongo.shop.orders \
  --from-beginning
```

## Custom Pipeline for Filtering Events

The `pipeline` parameter accepts a JSON array of aggregation pipeline stages applied to the Change Stream before events are published to Kafka. This reduces Kafka message volume significantly:

```json
"pipeline": "[{\"$match\":{\"fullDocument.status\":\"confirmed\",\"operationType\":\"insert\"}}]"
```

Only confirmed orders will be published.

## Resume Token Persistence

The connector automatically persists the Change Stream resume token through Kafka Connect's offset storage mechanism (the `connect-offsets` Kafka topic in distributed mode, or a local file in standalone mode). If Kafka Connect restarts, the connector resumes from the last token without missing events.

To customize the offset partition name used for storing the resume token:

```json
"offset.partition.name": "shop.orders"
```

## Publishing Delete Events

By default `publish.full.document.only` is `false`, but when set to `true` (as in the example above) deletes are excluded (since they have no full document). To capture deletes:

```json
"publish.full.document.only": "false",
"change.stream.full.document": "default"
```

Delete events will have `operationType: "delete"` and a `documentKey` with only the `_id`.

## Sink Connector for Writing Back to MongoDB

The MongoDB Kafka Sink Connector reads from Kafka topics and writes to MongoDB:

```json
{
  "name": "mongodb-sink-audit",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
    "connection.uri": "mongodb+srv://user:pass@cluster.mongodb.net",
    "database": "audit",
    "collection": "events",
    "topics": "mongo.shop.orders",
    "document.id.strategy": "com.mongodb.kafka.connect.sink.processor.id.strategy.PartialValueStrategy",
    "document.id.strategy.partial.value.projection.list": "_id",
    "writemodel.strategy": "com.mongodb.kafka.connect.sink.writemodel.strategy.ReplaceOneBusinessKeyStrategy"
  }
}
```

## Summary

The MongoDB Kafka Source Connector wraps Change Streams to provide a production-ready, resumable CDC pipeline. Configure the `pipeline` parameter to filter events at the source, enable `updateLookup` to get full documents on updates, and rely on the connector's built-in resume token persistence for fault tolerance. Pair it with a Sink Connector to replicate data to audit stores or other MongoDB clusters.
