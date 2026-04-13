# How to Set Up Atlas Stream Processing for Real-Time Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Stream Processing, Real-Time, Pipeline

Description: Configure MongoDB Atlas Stream Processing to filter, transform, and route real-time event streams using the familiar MongoDB aggregation pipeline syntax.

---

Atlas Stream Processing (ASP) lets you define continuous aggregation pipelines that consume data from Apache Kafka topics or Atlas Change Streams, transform it in-flight, and write results to Atlas collections or back to Kafka - all without managing any infrastructure.

## Prerequisites

- An M10+ Atlas cluster (Stream Processing requires a dedicated tier)
- Atlas CLI v1.14+ or access to the Atlas UI
- An existing Kafka cluster or Atlas cluster as the event source

## Creating a Stream Processing Instance

In the Atlas UI:

1. Go to **Data Services** > **Stream Processing**.
2. Click **Create Stream Processing Instance**.
3. Choose a cloud provider and region matching your cluster.
4. Click **Create**.

Or via the Atlas CLI:

```bash
atlas streams instances create myStreamProcessor \
  --provider AWS \
  --region US_EAST_1 \
  --tier SP30
```

## Defining a Connection

Connections declare the source or sink. Create a Kafka connection:

```bash
atlas streams connections create kafkaSource \
  --instance myStreamProcessor \
  --type Kafka \
  --bootstrap-servers "broker1:9092,broker2:9092" \
  --authentication SCRAM-SHA-512 \
  --username kafkaUser \
  --password "$KAFKA_PASS"
```

Or use an Atlas cluster as the source (Change Streams backed):

```bash
atlas streams connections create atlasSource \
  --instance myStreamProcessor \
  --type Cluster \
  --cluster myCluster
```

## Writing a Stream Processing Pipeline

ASP pipelines are expressed as MongoDB aggregation stages. Open the Stream Processing editor in the Atlas UI or write a JSON definition:

```json
[
  {
    "$source": {
      "connectionName": "kafkaSource",
      "topic": "sensor-readings"
    }
  },
  {
    "$match": {
      "temperature": { "$gt": 80 }
    }
  },
  {
    "$addFields": {
      "alertLevel": "HIGH",
      "processedAt": { "$dateToString": { "date": "$$NOW" } }
    }
  },
  {
    "$emit": {
      "connectionName": "atlasSource",
      "db": "sensors",
      "coll": "alerts"
    }
  }
]
```

## Starting and Monitoring the Pipeline

```bash
# Start the pipeline
atlas streams pipelines start myPipeline --instance myStreamProcessor

# Check status
atlas streams pipelines describe myPipeline --instance myStreamProcessor

# View processing stats
atlas streams pipelines stats myPipeline --instance myStreamProcessor
```

The `stats` command shows messages processed per second, lag, and error counts.

## Windowed Aggregations

Use `$tumblingWindow` or `$hoppingWindow` for time-based aggregations:

```json
{
  "$tumblingWindow": {
    "interval": { "size": 1, "unit": "minute" },
    "pipeline": [
      {
        "$group": {
          "_id": "$sensorId",
          "avgTemp": { "$avg": "$temperature" },
          "maxTemp": { "$max": "$temperature" }
        }
      }
    ]
  }
}
```

## Error Handling with Dead Letter Queues

Configure a dead letter queue to capture messages that fail processing:

```json
{
  "$source": {
    "connectionName": "kafkaSource",
    "topic": "orders",
    "dlq": {
      "connectionName": "kafkaSource",
      "topic": "orders-dlq"
    }
  }
}
```

## Summary

Atlas Stream Processing brings the MongoDB aggregation pipeline to real-time event streams, letting teams build stateful streaming applications without leaving the Atlas ecosystem. Define connections to Kafka or Atlas clusters, write a pipeline, and Atlas handles scaling, checkpointing, and fault recovery automatically.
