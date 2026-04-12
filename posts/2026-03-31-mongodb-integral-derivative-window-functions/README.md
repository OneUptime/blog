# How to Use $integral and $derivative in MongoDB Window Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Window Function, Integral, Analytics

Description: Learn how to use $integral and $derivative operators in MongoDB $setWindowFields to compute area under a curve and rate of change for time-series data.

---

MongoDB's `$integral` and `$derivative` operators inside `$setWindowFields` bring calculus-inspired operations to time-series aggregation. `$integral` computes the area under a curve (useful for energy consumption, distance, or total exposure), while `$derivative` computes the instantaneous rate of change (useful for speed, acceleration, or trend steepness).

## $integral Operator

`$integral` uses the trapezoidal rule to approximate the area under a curve defined by (x, y) pairs where x is the sort field (typically time) and y is the input expression.

### Syntax

```javascript
{
  $integral: {
    input: "<numeric expression>",
    unit: "<time unit>"  // optional, for date sort fields
  }
}
```

### Computing Total Energy Consumption

Integrate power readings over time to get total energy (kWh):

```javascript
db.powerReadings.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$deviceId",
      sortBy: { timestamp: 1 },
      output: {
        totalEnergyKwh: {
          $integral: {
            input: "$powerKw",
            unit: "hour"
          },
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
])
```

The unit `"hour"` means the integral is expressed in kW-hours. Without `unit`, the sort field must be numeric (not a Date), and the result is the raw numeric integral with no time-unit conversion.

### Computing Distance from Speed

Integrate speed over time to compute cumulative distance:

```javascript
db.vehicleTracking.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$vehicleId",
      sortBy: { timestamp: 1 },
      output: {
        cumulativeDistanceKm: {
          $integral: {
            input: "$speedKmh",
            unit: "hour"
          },
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
])
```

## $derivative Operator

`$derivative` computes the rate of change between the current document and the previous document in the window: `(y2 - y1) / (x2 - x1)`.

### Syntax

```javascript
{
  $derivative: {
    input: "<numeric expression>",
    unit: "<time unit>"  // optional, for date sort fields
  }
}
```

### Computing Speed from Position

Differentiate position changes over time to compute speed:

```javascript
db.gpsCoords.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$vehicleId",
      sortBy: { timestamp: 1 },
      output: {
        speedKmh: {
          $derivative: {
            input: "$distanceKm",
            unit: "hour"
          },
          window: { documents: [-1, 0] }
        }
      }
    }
  }
])
```

The `window: { documents: [-1, 0] }` is the typical choice for derivative - it computes the change between the current document and the previous one.

### Computing Rate of Change in Revenue

Detect acceleration or deceleration in revenue growth:

```javascript
db.dailyRevenue.aggregate([
  {
    $setWindowFields: {
      sortBy: { date: 1 },
      output: {
        revenueGrowthPerDay: {
          $derivative: {
            input: "$revenue",
            unit: "day"
          },
          window: { documents: [-1, 0] }
        }
      }
    }
  }
])
```

A positive `revenueGrowthPerDay` means revenue increased from the previous day; negative means it declined.

## Combining Both in One Stage

Compute derivative to get rate, then integrate that rate:

```javascript
db.sensorData.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$sensorId",
      sortBy: { timestamp: 1 },
      output: {
        rateOfChange: {
          $derivative: {
            input: "$value",
            unit: "second"
          },
          window: { documents: [-1, 0] }
        },
        cumulativeValue: {
          $integral: {
            input: "$value",
            unit: "second"
          },
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
])
```

## Supported Time Units

```text
"millisecond", "second", "minute", "hour", "day", "week"
```

## Summary

`$integral` and `$derivative` inside `$setWindowFields` enable calculus-based calculations on MongoDB time-series data. Use `$integral` to compute accumulated quantities like total energy consumed, total distance traveled, or total exposure time. Use `$derivative` to compute instantaneous rates like speed, revenue growth rate, or metric trend direction. Both operators work naturally with date sort fields and accept a `unit` parameter for intuitive physical unit output.
