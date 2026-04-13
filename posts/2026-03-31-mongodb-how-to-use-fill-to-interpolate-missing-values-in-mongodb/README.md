# How to Use $fill to Interpolate Missing Values in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $fill, Interpolation, Time Series, NoSQL

Description: Learn how to use MongoDB's $fill aggregation stage to populate null or missing field values using forward fill, backward fill, or linear interpolation.

---

## What Is the $fill Stage?

The `$fill` stage (introduced in MongoDB 5.3) populates null or missing values in documents using configurable fill methods. It is most useful after `$densify` to replace synthetic placeholder documents with meaningful values.

```javascript
{
  $fill: {
    partitionByFields: ["field1"],  // optional grouping
    sortBy: { fieldName: 1 },       // required for locf/linear
    output: {
      fieldToFill: { method: "locf" | "linear" | value: literal }
    }
  }
}
```

## Fill Methods

| Method | Description |
|---|---|
| `locf` | Last Observation Carried Forward - uses the last non-null value |
| `linear` | Linear interpolation between surrounding non-null values |
| `{ value: expr }` | Fill with a constant or computed value |

## Basic Example - LOCF (Last Observation Carried Forward)

```javascript
// Sensor data with gaps (null = missing reading)
{ ts: ISODate("2024-01-01"), sensorId: "s1", temp: 22.5 }
{ ts: ISODate("2024-01-02"), sensorId: "s1", temp: null }
{ ts: ISODate("2024-01-03"), sensorId: "s1", temp: null }
{ ts: ISODate("2024-01-04"), sensorId: "s1", temp: 21.0 }
```

Fill missing temperature readings with the last known value:

```javascript
db.sensorData.aggregate([
  {
    $fill: {
      sortBy: { ts: 1 },
      output: {
        temp: { method: "locf" }
      }
    }
  }
])
```

Output:

```javascript
{ ts: ISODate("2024-01-01"), sensorId: "s1", temp: 22.5 }
{ ts: ISODate("2024-01-02"), sensorId: "s1", temp: 22.5 }  // filled
{ ts: ISODate("2024-01-03"), sensorId: "s1", temp: 22.5 }  // filled
{ ts: ISODate("2024-01-04"), sensorId: "s1", temp: 21.0 }
```

## Linear Interpolation

For numeric fields where you want smooth transitions between known values:

```javascript
db.metrics.aggregate([
  {
    $fill: {
      sortBy: { timestamp: 1 },
      output: {
        value: { method: "linear" }
      }
    }
  }
])
```

Given values at positions 0 and 4, linear fill computes intermediate values proportionally.

## Partitioned Fill

Fill gaps per group independently:

```javascript
db.sensorData.aggregate([
  {
    $fill: {
      partitionByFields: ["sensorId"],
      sortBy: { ts: 1 },
      output: {
        temp: { method: "locf" },
        humidity: { method: "locf" }
      }
    }
  }
])
```

Each sensor's gaps are filled using that sensor's own last known reading.

## Fill with a Constant Value

Use a literal value or expression as the fill value:

```javascript
db.orders.aggregate([
  {
    $fill: {
      sortBy: { createdAt: 1 },
      output: {
        discount: { value: 0 },
        status: { value: "pending" }
      }
    }
  }
])
```

## Combining $densify and $fill

The most common pattern is to densify first (add placeholder documents), then fill in values:

```javascript
db.pageViews.aggregate([
  { $match: { page: "/home" } },
  // Step 1: Add documents for missing days
  {
    $densify: {
      field: "date",
      range: {
        step: 1,
        unit: "day",
        bounds: [new Date("2024-01-01"), new Date("2024-02-01")]
      }
    }
  },
  // Step 2: Fill missing view counts with 0
  {
    $fill: {
      sortBy: { date: 1 },
      output: {
        views: { value: 0 },
        uniqueVisitors: { value: 0 }
      }
    }
  }
])
```

## Practical Use Case - Stock Price Interpolation

Interpolate prices for days when the market was closed:

```javascript
db.stockPrices.aggregate([
  { $match: { ticker: "AAPL" } },
  {
    $densify: {
      field: "date",
      range: { step: 1, unit: "day", bounds: "full" }
    }
  },
  {
    $fill: {
      sortBy: { date: 1 },
      output: {
        closingPrice: { method: "linear" },
        volume: { value: 0 }  // zero volume on non-trading days
      }
    }
  }
])
```

## Backward Fill

MongoDB's `$fill` natively supports LOCF (forward fill). For backward fill, reverse the sort order:

```javascript
// Backward fill (next observation carried backward)
db.sensorData.aggregate([
  {
    $fill: {
      sortBy: { ts: -1 },  // reverse order
      output: { temp: { method: "locf" } }
    }
  },
  { $sort: { ts: 1 } }  // re-sort ascending afterward
])
```

## Handling the First Document

If the first document in a sorted sequence has a null value, LOCF cannot fill it (there's no previous value). Use a two-pass approach — LOCF first, then a constant fill to catch the remaining leading nulls:

```javascript
db.data.aggregate([
  // First pass: LOCF fills all nulls that have a preceding non-null value
  {
    $fill: {
      sortBy: { ts: 1 },
      output: { value: { method: "locf" } }
    }
  },
  // Second pass: constant fill catches any remaining leading nulls
  {
    $fill: {
      sortBy: { ts: 1 },
      output: { value: { value: 0 } }
    }
  }
])
```

## Summary

The `$fill` stage provides flexible missing value imputation directly within MongoDB aggregation pipelines. LOCF is ideal for sensor data and event streams, linear interpolation suits smooth metric visualization, and constant fills work for counters and flags. Used together with `$densify`, it enables fully gapless time series for dashboards and analytics.
