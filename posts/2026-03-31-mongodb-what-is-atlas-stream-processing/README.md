# What Is MongoDB Atlas Stream Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Stream Processing, Streaming, Kafka, Real-Time

Description: MongoDB Atlas Stream Processing lets you continuously process data streams from Kafka and Atlas change streams using MongoDB aggregation pipelines in the cloud.

---

## Overview

MongoDB Atlas Stream Processing (ASP) is a managed real-time data processing service that lets you apply MongoDB aggregation pipeline logic to continuous data streams. Instead of running a pipeline once against a snapshot of data, you define a stream processor that runs continuously, consuming events from a source (Apache Kafka or Atlas change streams), transforming them using familiar MongoDB operators, and writing results to a sink (Atlas collections, Kafka topics).

This brings the MongoDB query language to the world of stream processing, eliminating the need for a separate streaming framework for many use cases.

## Core Concepts

**Stream Processor** - A named, continuously running pipeline that consumes from a source, transforms data, and writes to a sink.

**Source** - Where events come from. Currently supports:
- Apache Kafka (Confluent Cloud, self-hosted)
- Atlas change streams (changes to a collection)

**Sink** - Where processed results go. Currently supports:
- Atlas collections via the `$merge` stage (persist processed results)
- Kafka topics via the `$emit` stage (forward events to downstream systems)

**Dead Letter Queue (DLQ)** - A separate configuration option (not a sink stage) that routes failed messages to an Atlas collection for inspection.

**Tumbling and Hopping Windows** - Time-based grouping for aggregations like 1-minute counts or 5-minute moving sums.

## Creating a Stream Processor

Stream processors are created using `mongosh` connected to a Stream Processing Instance, or via the Atlas CLI. The source and sink are defined as `$source` and `$merge` (or `$emit`) stages within the pipeline array:

```javascript
// Example: Count orders per minute, write results to Atlas
// Run in mongosh connected to a Stream Processing Instance
sp.createStreamProcessor("orderCountProcessor", [
  {
    $source: {
      connectionName: "kafkaConnection",
      topic: "orders"
    }
  },
  {
    $match: { status: { $in: ["placed", "confirmed"] } }
  },
  {
    $tumblingWindow: {
      interval: { size: 1, unit: "minute" },
      pipeline: [
        {
          $group: {
            _id: "$region",
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: "$amount" }
          }
        }
      ]
    }
  },
  {
    $merge: {
      into: {
        connectionName: "atlasConnection",
        db: "analytics",
        coll: "orderMetrics"
      }
    }
  }
])
```

## Connecting to Kafka

Define a Kafka connection in the Stream Processing instance's Connection Registry (via the Atlas UI or Atlas CLI):

```json
{
  "name": "kafkaConnection",
  "type": "Kafka",
  "bootstrapServers": "broker1:9092,broker2:9092",
  "security": {
    "protocol": "SASL_SSL",
    "saslMechanism": "PLAIN",
    "username": "kafka-user",
    "password": "<password>"
  }
}
```

## Using Change Streams as Source

You can process changes to an Atlas collection as a stream by using a `$source` stage that references an Atlas connection:

```javascript
// $source stage for an Atlas change stream
{
  $source: {
    connectionName: "atlasConnection",
    db: "shop",
    coll: "orders"
  }
}
```

## Windowed Aggregations

Atlas Stream Processing supports two window types:

**Tumbling window** - Fixed, non-overlapping time windows:

```javascript
{ "$tumblingWindow": { "interval": { "size": 5, "unit": "minute" }, "pipeline": [...] } }
```

**Hopping window** - Fixed size, overlapping windows that advance by a hop interval:

```javascript
{
  "$hoppingWindow": {
    "interval": { "size": 10, "unit": "minute" },
    "hopSize": { "size": 5, "unit": "minute" },
    "pipeline": [...]
  }
}
```

## When to Use Atlas Stream Processing

- Real-time dashboards fed from high-volume event streams
- Alert generation based on streaming metrics (e.g., error rate exceeds threshold)
- ETL from Kafka topics into Atlas collections for operational use
- Enriching Kafka events with MongoDB reference data before forwarding
- Computing streaming aggregations without deploying Flink or Spark

## Summary

MongoDB Atlas Stream Processing brings MongoDB aggregation pipelines to real-time streaming data, enabling continuous transformations on Kafka and change stream sources. It is ideal for teams already using MongoDB who want to add streaming analytics without adopting a separate framework like Apache Flink or Spark Structured Streaming.
