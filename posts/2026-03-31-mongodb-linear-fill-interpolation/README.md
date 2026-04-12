# How to Use $linearFill for Linear Interpolation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Window Function, Aggregation, Interpolation, Time Series

Description: Learn how to use $linearFill in MongoDB's $setWindowFields to fill null gaps in time-series data using linear interpolation between known values.

---

Real-world time-series data often has gaps - sensor outages, missing readings, or irregular measurement intervals. MongoDB's `$linearFill` window function fills `null` values by linearly interpolating between the nearest non-null neighbors, producing a smooth, continuous dataset for analysis.

## How $linearFill Works

`$linearFill` looks at the nearest non-null value before and after each null, then computes a proportional value based on the sort position. It requires a `sortBy` clause - interpolation is based on the sorted document order, not the actual time values (though using a time field for sorting produces meaningful results).

## Basic Linear Interpolation

Fill missing temperature readings from a sensor:

```javascript
// Sample data with gaps:
// { sensorId: "s1", timestamp: 0, temp: 20 }
// { sensorId: "s1", timestamp: 1, temp: null }  <- missing
// { sensorId: "s1", timestamp: 2, temp: null }  <- missing
// { sensorId: "s1", timestamp: 3, temp: 26 }

db.sensor_readings.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$sensorId",
      sortBy: { timestamp: 1 },
      output: {
        filledTemp: {
          $linearFill: "$temp"
        }
      }
    }
  }
]);

// Result:
// { timestamp: 0, temp: 20, filledTemp: 20 }
// { timestamp: 1, temp: null, filledTemp: 22 }  <- interpolated
// { timestamp: 2, temp: null, filledTemp: 24 }  <- interpolated
// { timestamp: 3, temp: 26, filledTemp: 26 }
```

The gap between 20 and 26 is divided evenly: positions 1 and 2 get 22 and 24.

## Using $linearFill with Actual Timestamps

Even when sorting by timestamps or numeric values, `$linearFill` distributes values evenly based on document position, not the actual sort field values. Using a meaningful sort field like a timestamp ensures correct document ordering for interpolation:

```javascript
db.price_history.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$assetId",
      sortBy: { unixTimestamp: 1 },
      output: {
        interpolatedPrice: {
          $linearFill: "$price"
        }
      }
    }
  },
  {
    $project: {
      assetId: 1,
      recordedAt: 1,
      price: 1,
      interpolatedPrice: { $round: ["$interpolatedPrice", 4] }
    }
  }
]);
```

## Combining $linearFill with Regular Intervals

First generate a regular time grid, then join your data and apply `$linearFill`:

```javascript
// Step 1: Use $densify to create regular hourly intervals
db.readings.aggregate([
  {
    $densify: {
      field: "hourlyTimestamp",
      range: {
        step: 1,
        unit: "hour",
        bounds: "partition"
      },
      partitionByFields: ["stationId"]
    }
  },
  // Step 2: Fill the gaps created by $densify with linear interpolation
  {
    $setWindowFields: {
      partitionBy: "$stationId",
      sortBy: { hourlyTimestamp: 1 },
      output: {
        interpolatedValue: {
          $linearFill: "$measurementValue"
        }
      }
    }
  }
]);
```

`$densify` creates placeholder documents with `null` values at regular intervals, then `$linearFill` fills those nulls.

## Handling Leading and Trailing Nulls

`$linearFill` can only interpolate between two known values. Leading nulls (before the first known value) and trailing nulls (after the last known value) remain null:

```javascript
// Data: [null, null, 10, null, 20, null, null]
// After $linearFill: [null, null, 10, 15, 20, null, null]
// Leading and trailing nulls are NOT filled
```

Combine with `$locf` (Last Observation Carried Forward) to handle trailing nulls if needed.

## Verifying Interpolated vs Original Values

Track which values were interpolated by adding a flag before filling:

```javascript
db.metrics.aggregate([
  {
    $addFields: {
      isOriginal: { $ne: ["$value", null] }
    }
  },
  {
    $setWindowFields: {
      partitionBy: "$metricId",
      sortBy: { measurementTime: 1 },
      output: {
        filledValue: { $linearFill: "$value" }
      }
    }
  }
]);
```

## Summary

`$linearFill` is MongoDB's tool for gap-imputation in time-series data using straight-line interpolation between known values. Combine it with `$densify` to first create a regular grid and then fill the gaps. Remember that leading and trailing nulls remain unfilled - use `$locf` for those cases. Together, `$linearFill` and `$locf` give you complete control over gap-filling strategies in MongoDB time-series pipelines.
