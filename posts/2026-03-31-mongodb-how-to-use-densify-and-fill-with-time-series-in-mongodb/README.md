# How to Use $densify and $fill with Time Series in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Series, Densify, Fill, Aggregation

Description: Use MongoDB's $densify and $fill aggregation stages to add missing time intervals and interpolate values in time series data gaps.

---

## The Problem: Gaps in Time Series Data

Real-world time series data often has gaps - sensors go offline, events don't occur, or data is simply missing for certain intervals. These gaps cause problems in visualizations and analysis.

MongoDB 5.1+ provides two aggregation stages to solve this:
- **`$densify`**: Adds documents for missing time intervals
- **`$fill`**: Populates null/missing field values in documents

## $densify: Fill Missing Time Intervals

`$densify` generates new documents for each missing value in a sequence (numeric or date).

### Basic Syntax

```javascript
{
  $densify: {
    field: "timestamp",           // Field to densify
    range: {
      step: 1,                    // Interval size
      unit: "hour",               // Unit for date fields
      bounds: "full"              // "full", "partition", or [min, max]
    },
    partitionByFields: ["metadata.sensorId"]  // Group by (optional)
  }
}
```

### Example: Fill Missing Hourly Readings

```javascript
// Source data has gaps at 02:00 and 03:00
// timestamp: 00:00, 01:00, [gap], [gap], 04:00, 05:00

db.sensor_readings.aggregate([
  {
    $match: {
      "metadata.sensorId": "sensor-001",
      timestamp: {
        $gte: new Date("2024-01-15T00:00:00Z"),
        $lte: new Date("2024-01-15T23:59:59Z")
      }
    }
  },
  {
    $densify: {
      field: "timestamp",
      range: {
        step: 1,
        unit: "hour",
        bounds: [
          new Date("2024-01-15T00:00:00Z"),
          new Date("2024-01-15T23:59:59Z")
        ]
      }
    }
  }
])
```

Output now includes documents for every hour, with null values for generated documents.

### Densify Per Partition

Generate continuous time series per sensor:

```javascript
db.sensor_readings.aggregate([
  {
    $match: {
      timestamp: {
        $gte: new Date("2024-01-15"),
        $lt: new Date("2024-01-16")
      }
    }
  },
  {
    $densify: {
      field: "timestamp",
      partitionByFields: ["metadata.sensorId"],
      range: {
        step: 15,
        unit: "minute",
        bounds: "partition"    // Use min/max per partition
      }
    }
  }
])
```

`bounds: "partition"` uses the min and max values per partition group. `bounds: "full"` uses the global min/max.

## $fill: Interpolate Missing Values

`$fill` fills in `null` or missing values in documents using a strategy.

### Fill Strategies

| Strategy | Description |
|---|---|
| `locf` | Last Observation Carried Forward - use the previous non-null value |
| `linear` | Linear interpolation between surrounding values |
| `{ value: X }` | Fill with a constant value |

### Example: Carry Forward Last Value

```javascript
db.sensor_readings.aggregate([
  {
    $match: {
      "metadata.sensorId": "sensor-001",
      timestamp: { $gte: new Date("2024-01-15") }
    }
  },
  {
    $densify: {
      field: "timestamp",
      range: { step: 1, unit: "hour", bounds: "full" }
    }
  },
  {
    $fill: {
      sortBy: { timestamp: 1 },
      output: {
        temperature: { method: "locf" },
        humidity: { method: "locf" }
      }
    }
  }
])
```

Generated documents now have the last known temperature/humidity carried forward.

### Example: Linear Interpolation

```javascript
db.sensor_readings.aggregate([
  { $match: { "metadata.sensorId": "sensor-001" } },
  {
    $densify: {
      field: "timestamp",
      range: { step: 5, unit: "minute", bounds: "full" }
    }
  },
  {
    $fill: {
      output: {
        temperature: { method: "linear" }
      },
      sortBy: { timestamp: 1 }    // Required for locf and linear methods
    }
  }
])
```

Linear fill calculates values proportionally between two known data points.

### Example: Fill with Constant

```javascript
{
  $fill: {
    output: {
      status: { value: "UNKNOWN" },
      temperature: { value: 0 }
    }
  }
}
```

### Fill Per Partition

```javascript
db.sensor_readings.aggregate([
  {
    $densify: {
      field: "timestamp",
      partitionByFields: ["metadata.sensorId"],
      range: { step: 1, unit: "hour", bounds: "full" }
    }
  },
  {
    $fill: {
      partitionBy: { sensorId: "$metadata.sensorId" },
      sortBy: { timestamp: 1 },
      output: {
        temperature: { method: "linear" },
        humidity: { method: "locf" }
      }
    }
  }
])
```

## Complete Pipeline: Dashboard-Ready Time Series

```javascript
db.sensor_readings.aggregate([
  // 1. Filter to date range
  {
    $match: {
      "metadata.sensorId": { $in: ["sensor-001", "sensor-002"] },
      timestamp: {
        $gte: new Date("2024-01-15T00:00:00Z"),
        $lt: new Date("2024-01-16T00:00:00Z")
      }
    }
  },
  // 2. Generate missing 15-minute intervals per sensor
  {
    $densify: {
      field: "timestamp",
      partitionByFields: ["metadata.sensorId"],
      range: { step: 15, unit: "minute", bounds: "full" }
    }
  },
  // 3. Fill gaps using last known value
  {
    $fill: {
      partitionBy: { sensorId: "$metadata.sensorId" },
      sortBy: { timestamp: 1 },
      output: {
        temperature: { method: "locf" },
        humidity: { method: "linear" }
      }
    }
  },
  // 4. Sort for output
  { $sort: { "metadata.sensorId": 1, timestamp: 1 } }
])
```

## Summary

`$densify` fills in missing time (or numeric) intervals in a sequence by generating placeholder documents, while `$fill` populates null values in those documents using LOCF (carry-forward), linear interpolation, or constant values. Use them together in aggregation pipelines to produce gap-free time series suitable for dashboards, charts, and downstream analytics - densify first to create the missing intervals, then fill to assign meaningful values.
