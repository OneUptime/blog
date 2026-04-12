# How to Use MongoDB with Kafka for Event Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kafka, Event, Streaming, Integration

Description: Learn how to integrate MongoDB with Apache Kafka using the MongoDB Kafka Connector to stream change events from MongoDB to Kafka and sink Kafka messages to MongoDB.

---

## MongoDB and Kafka Integration Patterns

MongoDB and Kafka complement each other in event-driven architectures. MongoDB stores operational data and Kafka distributes change events to other systems. The MongoDB Kafka Connector provides two connector types: a source connector that publishes MongoDB change stream events to Kafka topics, and a sink connector that consumes Kafka messages and writes them to MongoDB.

```mermaid
flowchart LR
    App[Application] --> MongoDB[MongoDB]
    MongoDB --> ChangeStream[Change Stream]
    ChangeStream --> SourceConnector[Kafka Source Connector]
    SourceConnector --> Kafka[Kafka Topics]
    Kafka --> SinkConnector[Kafka Sink Connector]
    SinkConnector --> MongoDBSink[MongoDB sink collection]
    Kafka --> OtherConsumers[Other consumers: Elasticsearch, analytics, etc.]
```

## Installing the MongoDB Kafka Connector

Download the connector from Confluent Hub or the MongoDB website:

```bash
# Using Confluent Hub CLI
confluent-hub install mongodb/kafka-connect-mongodb:latest

# Or download manually and place in Kafka Connect plugins directory
wget https://repo1.maven.org/maven2/org/mongodb/kafka/mongo-kafka-connect/1.13.0/mongo-kafka-connect-1.13.0-all.jar
sudo mkdir -p /opt/kafka/plugins/mongo-connector
sudo mv mongo-kafka-connect-1.13.0-all.jar /opt/kafka/plugins/mongo-connector/
```

## Setting Up the Source Connector

The source connector watches MongoDB Change Streams and publishes events to Kafka topics.

Create the source connector via the Kafka Connect REST API:

```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mongodb-source-orders",
    "config": {
      "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
      "connection.uri": "mongodb://admin:password@localhost:27017/?authSource=admin&replicaSet=rs0",
      "database": "myapp",
      "collection": "orders",
      "topic.prefix": "mongodb",
      "output.format.value": "json",
      "output.schema.infer.value": true,
      "publish.full.document.only": "true",
      "change.stream.full.document": "updateLookup",
      "heartbeat.interval.ms": "10000"
    }
  }'
```

This creates a Kafka topic named `mongodb.myapp.orders` that receives a message for every insert, update, and delete on the `orders` collection.

## Source Connector Configuration Options

| Option | Description |
|---|---|
| `publish.full.document.only` | Publish the full document instead of the raw change event |
| `change.stream.full.document` | `updateLookup` returns the post-update full document |
| `pipeline` | Filter which events to publish using an aggregation pipeline |
| `output.format.value` | `json` or `bson` |
| `copy.existing` | Copy existing documents to Kafka before starting the stream |

Filter to only publish completed orders:

```json
{
  "pipeline": "[{\"$match\": {\"fullDocument.status\": \"completed\"}}]"
}
```

## Setting Up the Sink Connector

The sink connector consumes messages from a Kafka topic and writes them to MongoDB:

```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mongodb-sink-analytics",
    "config": {
      "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
      "connection.uri": "mongodb://admin:password@localhost:27017/?authSource=admin",
      "database": "analytics",
      "collection": "order_events",
      "topics": "order-completed-events",
      "document.id.strategy": "com.mongodb.kafka.connect.sink.processor.id.strategy.BsonOidStrategy",
      "writemodel.strategy": "com.mongodb.kafka.connect.sink.writemodel.strategy.InsertOneDefaultStrategy",
      "max.num.retries": 3,
      "retries.defer.timeout": 5000
    }
  }'
```

## Upsert Strategy for the Sink Connector

Use upsert to prevent duplicates when reprocessing:

```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mongodb-sink-orders-sync",
    "config": {
      "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
      "connection.uri": "mongodb://admin:password@localhost:27017/?authSource=admin",
      "database": "replica",
      "collection": "orders",
      "topics": "mongodb.myapp.orders",
      "document.id.strategy": "com.mongodb.kafka.connect.sink.processor.id.strategy.ProvidedInKeyStrategy",
      "writemodel.strategy": "com.mongodb.kafka.connect.sink.writemodel.strategy.ReplaceOneDefaultStrategy"
    }
  }'
```

## Using MongoDB Change Streams Directly with Kafka (No Connector)

For custom integration without Kafka Connect, use Change Streams in your application and produce to Kafka manually:

```javascript
const { MongoClient } = require("mongodb");
const { Kafka } = require("kafkajs");

const mongoClient = new MongoClient("mongodb://localhost:27017");
await mongoClient.connect();

const kafka = new Kafka({ brokers: ["localhost:9092"] });
const producer = kafka.producer();
await producer.connect();

const db = mongoClient.db("myapp");
const collection = db.collection("orders");

// Watch with a resume token for fault tolerance
let resumeToken = null;

const changeStream = collection.watch(
  [{ $match: { operationType: { $in: ["insert", "update", "replace"] } } }],
  { fullDocument: "updateLookup", resumeAfter: resumeToken }
);

changeStream.on("change", async (change) => {
  resumeToken = change._id;  // Save resume token for restart

  try {
    await producer.send({
      topic: "order-events",
      messages: [
        {
          key: change.fullDocument?.orderId?.toString(),
          value: JSON.stringify({
            operationType: change.operationType,
            document: change.fullDocument,
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    console.log(`Published ${change.operationType} event for order ${change.fullDocument?.orderId}`);
  } catch (err) {
    console.error("Failed to publish to Kafka:", err.message);
    // Handle error - the change stream will continue from the last resume token
  }
});
```

## Consuming Kafka Events to Update MongoDB

Consume events from a Kafka topic and update MongoDB:

```javascript
const { Kafka } = require("kafkajs");
const { MongoClient } = require("mongodb");

const kafka = new Kafka({ brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "mongo-writer" });

const mongoClient = new MongoClient("mongodb://localhost:27017");
await mongoClient.connect();
const db = mongoClient.db("analytics");

await consumer.connect();
await consumer.subscribe({ topic: "user-events", fromBeginning: false });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    // Write to MongoDB using upsert for idempotency
    await db.collection("user_activity").updateOne(
      { eventId: event.id },
      {
        $set: {
          userId: event.userId,
          eventType: event.type,
          properties: event.properties,
          processedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }
});
```

## Monitoring the Connector

Check connector status:

```bash
curl http://localhost:8083/connectors/mongodb-source-orders/status
```

List all connectors:

```bash
curl http://localhost:8083/connectors
```

Restart a connector:

```bash
curl -X POST http://localhost:8083/connectors/mongodb-source-orders/restart
```

## Summary

MongoDB and Kafka integrate through the MongoDB Kafka Connector (source + sink) or direct application-level Change Stream producers. The source connector publishes MongoDB change events to Kafka topics, enabling downstream consumers such as Elasticsearch, analytics pipelines, and microservices to receive real-time data changes. The sink connector writes Kafka messages back to MongoDB collections. Use upsert strategies in the sink connector for idempotent processing, and persist resume tokens in source implementations for fault-tolerant restart after failures.
