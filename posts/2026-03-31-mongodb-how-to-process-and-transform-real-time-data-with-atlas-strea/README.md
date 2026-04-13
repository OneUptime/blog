# How to Process and Transform Real-Time Data with Atlas Stream Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Stream Processing, Real-Time, Data Transformation

Description: Learn how to enrich, filter, and transform real-time streaming data using MongoDB Atlas Stream Processing aggregation operators and lookup stages.

---

## Overview

Atlas Stream Processing brings MongoDB's rich aggregation framework to streaming data. You can apply `$addFields`, `$project`, `$lookup`, and other operators on messages as they flow through the pipeline, enabling real-time enrichment and transformation without batch ETL jobs.

## Connecting to Your Instance

```bash
mongosh "mongodb://stream.mongodb.net/?directConnection=true" -u admin -p secret
```

## Real-Time Field Transformation

Transform and normalize incoming Kafka messages on the fly:

```javascript
sp.createStreamProcessor("normalizeEvents", [
  {
    $source: {
      connectionName: "prod-kafka",
      topic: "raw-user-events"
    }
  },

  // Normalize field names and types
  {
    $project: {
      userId: { $toString: "$user_id" },
      eventType: { $toLower: "$event_type" },
      timestamp: { $toDate: "$ts" },
      properties: {
        pageUrl: "$props.url",
        referrer: "$props.ref",
        deviceType: {
          $switch: {
            branches: [
              { case: { $regexMatch: { input: "$props.ua", regex: /Mobile/ } }, then: "mobile" },
              { case: { $regexMatch: { input: "$props.ua", regex: /Tablet/ } }, then: "tablet" }
            ],
            default: "desktop"
          }
        }
      }
    }
  },

  {
    $merge: {
      into: {
        connectionName: "prod-atlas",
        db: "events",
        coll: "normalizedEvents"
      }
    }
  }
])
```

## Enriching Streams with $lookup

Look up reference data from Atlas collections to enrich streaming messages:

```javascript
sp.createStreamProcessor("enrichOrders", [
  {
    $source: {
      connectionName: "prod-kafka",
      topic: "order-placed"
    }
  },

  // Enrich with customer data from Atlas
  {
    $lookup: {
      from: {
        connectionName: "prod-atlas",
        db: "crm",
        coll: "customers"
      },
      localField: "customerId",
      foreignField: "_id",
      as: "customerInfo"
    }
  },
  { $unwind: { path: "$customerInfo", preserveNullAndEmptyArrays: true } },

  // Add enriched fields
  {
    $addFields: {
      customerTier: { $ifNull: ["$customerInfo.tier", "standard"] },
      customerCountry: "$customerInfo.country",
      requiresManualReview: {
        $and: [
          { $gt: ["$amount", 10000] },
          { $eq: ["$customerInfo.tier", "new"] }
        ]
      }
    }
  },

  { $unset: "customerInfo" },

  {
    $merge: {
      into: {
        connectionName: "prod-atlas",
        db: "orders",
        coll: "enrichedOrders"
      }
    }
  }
])
```

## Conditional Routing with $emit

Route messages to different topics based on content using a dynamic expression for the topic field:

```javascript
sp.createStreamProcessor("routeEvents", [
  {
    $source: {
      connectionName: "prod-kafka",
      topic: "all-events"
    }
  },

  // Route transactions to different topics based on amount
  {
    $emit: {
      connectionName: "prod-kafka",
      topic: {
        $switch: {
          branches: [
            { case: { $gte: ["$amount", 1000] }, then: "high-value-transactions" }
          ],
          default: "standard-transactions"
        }
      }
    }
  }
])
```

## Data Validation and Filtering

Filter out malformed messages and log them separately:

```javascript
sp.createStreamProcessor("validateAndProcess", [
  {
    $source: {
      connectionName: "prod-kafka",
      topic: "incoming-data"
    }
  },

  // Add validation flags
  {
    $addFields: {
      isValid: {
        $and: [
          { $ne: ["$userId", null] },
          { $ne: ["$eventType", null] },
          { $gte: [{ $strLenCP: { $toString: "$userId" } }, 1] }
        ]
      }
    }
  },

  // Filter out invalid messages and keep only valid ones
  { $match: { isValid: true } },
  { $unset: "isValid" },

  {
    $merge: {
      into: {
        connectionName: "prod-atlas",
        db: "events",
        coll: "validatedEvents"
      }
    }
  }
])
```

## Computing Derived Metrics in Real Time

Calculate metrics like conversion rates and average order values:

```javascript
sp.createStreamProcessor("realtimeMetrics", [
  {
    $source: {
      connectionName: "prod-kafka",
      topic: "checkout-events",
      timeField: { $toDate: "$timestamp" }
    }
  },

  {
    $tumblingWindow: {
      interval: { size: 5, unit: "minute" },
      pipeline: [
        {
          $group: {
            _id: "$campaignId",
            checkouts: { $sum: 1 },
            totalRevenue: { $sum: "$amount" },
            avgOrderValue: { $avg: "$amount" },
            uniqueCustomers: { $addToSet: "$customerId" }
          }
        },
        {
          $addFields: {
            uniqueCustomerCount: { $size: "$uniqueCustomers" },
            windowEnd: "$$NOW"
          }
        },
        { $unset: "uniqueCustomers" }
      ]
    }
  },

  {
    $merge: {
      into: {
        connectionName: "prod-atlas",
        db: "analytics",
        coll: "campaignMetrics"
      },
      on: ["_id", "windowEnd"],
      whenNotMatched: "insert",
      whenMatched: "replace"
    }
  }
])
```

## Monitoring Processor Performance

```javascript
// Check throughput and latency
sp.realtimeMetrics.stats()
/*
{
  status: "running",
  messagesIn: 142853,
  messagesOut: 28,
  windowsEmitted: 28,
  lastMessageTime: ISODate("2024-06-01T12:05:00Z"),
  processingLag: "2.3s"
}
*/
```

## Summary

Atlas Stream Processing transforms real-time streaming data using MongoDB aggregation operators including `$lookup` for enrichment, `$addFields` for computed fields, `$project` for normalization, and windowing stages for time-based aggregations. Build multi-stage pipelines that validate, enrich, and route messages from Kafka to Atlas collections in real time without additional ETL infrastructure.
