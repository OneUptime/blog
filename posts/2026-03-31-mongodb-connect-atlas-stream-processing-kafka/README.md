# How to Connect Atlas Stream Processing to Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Kafka, Stream Processing, Integration

Description: Learn how to connect MongoDB Atlas Stream Processing to Apache Kafka as a source or sink to build real-time data pipelines between Kafka topics and MongoDB collections.

---

## Why Connect Atlas Stream Processing to Kafka

Apache Kafka is a widely used distributed event streaming platform. Connecting MongoDB Atlas Stream Processing to Kafka allows you to consume events from Kafka topics, apply real-time transformations and aggregations using MongoDB's aggregation pipeline syntax, and write results to MongoDB Atlas collections - all without managing separate stream processing infrastructure.

## Prerequisites

- An Atlas Stream Processing workspace (SP10 or higher tier)
- A running Kafka cluster (self-hosted, Confluent Cloud, or MSK)
- Network connectivity between Atlas and your Kafka brokers

## Creating a Kafka Connection in Atlas

In the Atlas UI, navigate to your stream processing instance, then go to Connections and add a new Kafka connection.

For self-hosted Kafka, configure the connection via the Atlas CLI:

First, create a JSON configuration file named `kafka-connection.json`:

```json
{
  "name": "myKafkaSource",
  "type": "Kafka",
  "bootstrapServers": "broker1:9092,broker2:9092",
  "security": {
    "protocol": "SASL_SSL"
  },
  "authentication": {
    "mechanism": "PLAIN",
    "username": "<KAFKA_USERNAME>",
    "password": "<KAFKA_PASSWORD>"
  }
}
```

Then create the connection using the Atlas CLI:

```bash
# Create a Kafka connection for Atlas Stream Processing
atlas streams connections create \
  --instance myStreamInstance \
  --file kafka-connection.json
```

## Reading from a Kafka Topic as $source

Use the `$source` stage to read messages from a Kafka topic. Atlas Stream Processing automatically deserializes JSON payloads.

```javascript
[
  {
    $source: {
      connectionName: "myKafkaSource",
      topic: "order-events",
      timeField: {
        $dateFromString: {
          dateString: "$$ROOT.eventTimestamp"
        }
      }
    }
  },
  {
    $match: {
      eventType: "purchase"
    }
  },
  {
    $project: {
      orderId: 1,
      customerId: 1,
      amount: 1,
      eventTimestamp: 1
    }
  },
  {
    $merge: {
      into: {
        connectionName: "atlasCluster",
        db: "orders",
        coll: "purchases"
      }
    }
  }
]
```

## Writing to a Kafka Topic as $emit

Use `$emit` to write processed stream documents back to a Kafka topic:

```javascript
[
  {
    $source: {
      connectionName: "myKafkaSource",
      topic: "raw-sensor-data"
    }
  },
  {
    $tumblingWindow: {
      interval: { size: 1, unit: "minute" },
      pipeline: [
        {
          $group: {
            _id: "$deviceId",
            avgTemp: { $avg: "$temperature" },
            alertCount: {
              $sum: {
                $cond: [{ $gt: ["$temperature", 80] }, 1, 0]
              }
            }
          }
        }
      ]
    }
  },
  {
    $emit: {
      connectionName: "myKafkaSource",
      topic: "aggregated-sensor-metrics"   // Write results to a different topic
    }
  }
]
```

## Handling Kafka Message Schema

Atlas Stream Processing natively supports JSON messages. For Avro-encoded messages, configure a Schema Registry connection in your `$source` stage to enable automatic deserialization. Protobuf is not natively supported at this time.

```javascript
// If your Kafka messages use a timestamp field with epoch milliseconds
{
  $source: {
    connectionName: "myKafkaSource",
    topic: "events",
    timeField: {
      $toDate: "$$ROOT.timestampMs"   // Convert epoch ms to Date
    }
  }
}
```

## Monitoring the Pipeline

Check pipeline status and throughput via the Atlas UI or CLI:

```bash
# List stream processing instances
atlas streams instances list

# Describe a specific instance
atlas streams instances describe myStreamInstance
```

You can also manage individual stream processors from within `mongosh` connected to your stream processing instance:

```javascript
// List all stream processors
sp.listStreamProcessors()

// Get stats for a specific processor
sp.myProcessor.stats()
```

## Summary

Connecting MongoDB Atlas Stream Processing to Apache Kafka enables you to build real-time event processing pipelines using familiar MongoDB aggregation syntax. Use `$source` with a Kafka connection to consume topic messages, apply filtering, transformation, and windowed aggregations, and write results to Atlas collections with `$merge` or back to Kafka with `$emit`. Configure SASL authentication and ensure broker connectivity before creating your connection, and monitor pipeline throughput through the Atlas UI.
