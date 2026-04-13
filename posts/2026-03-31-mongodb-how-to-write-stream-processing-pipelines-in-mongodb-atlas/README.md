# How to Write Stream Processing Pipelines in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Stream Processing, Aggregation, Kafka

Description: Learn how to write and deploy stream processing pipelines in MongoDB Atlas using aggregation-style syntax to filter and route streaming data.

---

## Stream Processor Basics

Atlas Stream Processing pipelines use the same aggregation syntax as MongoDB queries. A stream processor continuously reads from a source (Kafka topic or Atlas collection), runs the pipeline, and writes to a sink.

Connect to your stream processing instance with `mongosh` before running commands:

```bash
mongosh "mongodb+srv://admin:secret@sp-instance.example.mongodb.net/"
```

## Creating a Simple Stream Processor

Read from a Kafka topic and write to an Atlas collection:

```javascript
// Create a stream processor that reads from Kafka and writes to Atlas
sp.createStreamProcessor("orderEvents", [
  // Stage 1: source - read from Kafka topic
  {
    $source: {
      connectionName: "prod-kafka",
      topic: "orders"
    }
  },

  // Stage 2: filter only completed orders
  {
    $match: {
      "fullDocument.status": "completed"
    }
  },

  // Stage 3: project only necessary fields
  {
    $project: {
      orderId: "$fullDocument.orderId",
      customerId: "$fullDocument.customerId",
      amount: "$fullDocument.amount",
      completedAt: "$fullDocument.updatedAt"
    }
  },

  // Stage 4: sink - write to Atlas collection
  {
    $merge: {
      into: {
        connectionName: "prod-atlas",
        db: "analytics",
        coll: "completedOrders"
      }
    }
  }
])
```

## Starting and Stopping Processors

```javascript
// Start the processor
sp.orderEvents.start()

// Check processor status
sp.orderEvents.stats()

// Stop the processor
sp.orderEvents.stop()

// Drop (delete) the processor
sp.orderEvents.drop()
```

## Filtering and Transforming Messages

Use standard aggregation operators within stream pipelines:

```javascript
sp.createStreamProcessor("sensorAlerts", [
  {
    $source: {
      connectionName: "iot-kafka",
      topic: "sensor-readings"
    }
  },

  // Filter high-temperature readings
  { $match: { temperature: { $gt: 80 } } },

  // Add computed fields
  {
    $addFields: {
      severity: {
        $cond: {
          if: { $gt: ["$temperature", 100] },
          then: "CRITICAL",
          else: "WARNING"
        }
      },
      alertTime: "$$NOW"
    }
  },

  // Emit to a different Kafka topic
  {
    $emit: {
      connectionName: "prod-kafka",
      topic: "sensor-alerts"
    }
  }
])
```

## Using Tumbling Windows for Aggregation

Aggregate streaming data over fixed time windows:

```javascript
sp.createStreamProcessor("minuteAggregations", [
  {
    $source: {
      connectionName: "prod-kafka",
      topic: "clickstream",
      timeField: { $toDate: "$timestamp" }
    }
  },

  // 1-minute tumbling window
  {
    $tumblingWindow: {
      interval: { size: 1, unit: "minute" },
      pipeline: [
        {
          $group: {
            _id: "$pageUrl",
            clickCount: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" }
          }
        },
        {
          $project: {
            pageUrl: "$_id",
            clickCount: 1,
            uniqueUserCount: { $size: "$uniqueUsers" }
          }
        }
      ]
    }
  },

  {
    $merge: {
      into: {
        connectionName: "prod-atlas",
        db: "analytics",
        coll: "minutePageStats"
      }
    }
  }
])
```

## Using Hopping Windows

Hopping windows slide forward, allowing overlapping aggregations:

```javascript
sp.createStreamProcessor("rollingCounts", [
  {
    $source: {
      connectionName: "prod-kafka",
      topic: "events",
      timeField: { $toDate: "$eventTime" }
    }
  },

  // 5-minute window, advancing every 1 minute
  {
    $hoppingWindow: {
      interval: { size: 5, unit: "minute" },
      hopSize: { size: 1, unit: "minute" },
      pipeline: [
        {
          $group: {
            _id: "$eventType",
            count: { $sum: 1 }
          }
        }
      ]
    }
  },

  {
    $merge: {
      into: {
        connectionName: "prod-atlas",
        db: "analytics",
        coll: "rollingEventCounts"
      }
    }
  }
])
```

## Handling Dead Letter Queue

Route failed messages to a dead letter collection by specifying a `dlq` option:

```javascript
sp.createStreamProcessor("safeProcessor", [
  {
    $source: {
      connectionName: "prod-kafka",
      topic: "raw-events"
    }
  },

  { $match: { "fullDocument.type": { $exists: true } } },

  {
    $merge: {
      into: {
        connectionName: "prod-atlas",
        db: "events",
        coll: "processed"
      },
      on: "_id",
      whenNotMatched: "insert",
      whenMatched: "replace"
    }
  }
], {
  dlq: {
    connectionName: "prod-atlas",
    db: "events",
    coll: "deadLetterQueue"
  }
})
```

## Listing and Inspecting Processors

```javascript
// List all processors and their status
sp.listStreamProcessors()

// Get detailed stats for a processor
sp.orderEvents.stats()
// Returns: status, messagesIn, messagesOut, errors, watermark

// Sample messages flowing through the processor
sp.orderEvents.sample()
```

## Summary

Atlas Stream Processing pipelines use MongoDB aggregation syntax with special source (`$source`), emit (`$emit`), and merge (`$merge`) stages for streaming I/O. Use `$tumblingWindow` and `$hoppingWindow` for time-based aggregations over continuous data. Create, start, and manage processors through `mongosh` connected to your stream processing instance.
