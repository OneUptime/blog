# How to Use Window Functions in Atlas Stream Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Stream Processing, Window Function, Real-Time

Description: Learn how to use window functions in MongoDB Atlas Stream Processing to compute rolling aggregations, sliding averages, and time-based analytics on streaming data.

---

## What Are Window Functions in Stream Processing

Window functions in Atlas Stream Processing compute aggregations over a sliding or tumbling window of recent events, without waiting for the entire stream to complete. Instead of processing one event at a time, window functions allow you to calculate metrics like rolling averages, cumulative sums, or maximum values over the last N seconds or N documents.

Atlas Stream Processing exposes window functions through the `$tumblingWindow` and `$hoppingWindow` stream operators.

## Setting Up an Atlas Stream Processing Instance

Before writing window function pipelines, configure your stream processing instance in Atlas and define a source connection.

```javascript
// Atlas Stream Processing source definition (Atlas CLI)
// atlascli streams connection create --type kafka --name myKafkaSource
```

In the Atlas UI, navigate to Stream Processing, create a stream instance, and add a source connection.

## Tumbling Windows

A tumbling window divides a continuous stream into fixed, non-overlapping time intervals. Each event belongs to exactly one window.

```javascript
// Atlas Stream Processing pipeline with 1-minute tumbling window
[
  {
    $source: {
      connectionName: "sensorKafka",
      topic: "temperature-readings"
    }
  },
  {
    $tumblingWindow: {
      interval: { size: 1, unit: "minute" },
      pipeline: [
        {
          $group: {
            _id: "$sensorId",
            avgTemp: { $avg: "$temperature" },
            maxTemp: { $max: "$temperature" },
            readingCount: { $sum: 1 }
          }
        }
      ]
    }
  },
  {
    $merge: {
      into: {
        connectionName: "atlasCluster",
        db: "metrics",
        coll: "minuteAggregates"
      }
    }
  }
]
```

## Hopping Windows

A hopping window slides forward by a defined step interval, creating overlapping windows. This is useful for rolling metrics like a 5-minute average updated every 30 seconds.

```javascript
[
  {
    $source: {
      connectionName: "sensorKafka",
      topic: "temperature-readings"
    }
  },
  {
    $hoppingWindow: {
      interval: { size: 5, unit: "minute" },    // 5-minute window size
      hopSize: { size: 30, unit: "second" },     // Advance every 30 seconds
      pipeline: [
        {
          $group: {
            _id: "$sensorId",
            rollingAvg: { $avg: "$temperature" }
          }
        }
      ]
    }
  },
  {
    $emit: {
      connectionName: "outputKafka",
      topic: "rolling-averages"
    }
  }
]
```

## Using Tumbling Windows for Event Aggregation

For use cases where you need to aggregate events by user or entity over a short time period, use a tumbling window with a `$group` stage.

```javascript
[
  {
    $source: { connectionName: "eventsSource", topic: "user-events" }
  },
  {
    $tumblingWindow: {
      interval: { size: 5, unit: "minute" },
      pipeline: [
        {
          $group: {
            _id: "$userId",
            recentEventCount: { $sum: 1 },
            avgValue: { $avg: "$value" }
          }
        }
      ]
    }
  },
  {
    $merge: {
      into: {
        connectionName: "atlasCluster",
        db: "analytics",
        coll: "enrichedEvents"
      }
    }
  }
]
```

Note that `$setWindowFields` is a standard MongoDB aggregation stage and is not supported in Atlas Stream Processing pipelines. Use `$tumblingWindow` or `$hoppingWindow` for windowed computations on streaming data.

## Filtering Within Window Pipelines

Window pipelines support standard aggregation stages for pre-filtering events before aggregation.

```javascript
{
  $tumblingWindow: {
    interval: { size: 5, unit: "minute" },
    pipeline: [
      { $match: { severity: "critical" } },   // Only aggregate critical events
      { $group: { _id: "$service", count: { $sum: 1 } } }
    ]
  }
}
```

## Summary

Window functions in MongoDB Atlas Stream Processing enable real-time rolling analytics on continuous data streams. Use tumbling windows for non-overlapping time-bucket aggregations like per-minute summaries. Use hopping windows for sliding metrics that update more frequently than the window duration. Window functions output results to Atlas collections via `$merge` or emit them downstream to Kafka topics via `$emit` for further processing.
