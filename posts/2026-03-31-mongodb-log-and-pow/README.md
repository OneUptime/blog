# How to Use $log and $pow in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $log, $log10, $ln, $pow, $exp, $sqrt, Pipeline, Math

Description: Learn how to use $log, $ln, $log10, $pow, $exp, and $sqrt in MongoDB aggregation for logarithmic and exponential calculations.

---

## Overview

MongoDB provides a set of mathematical expression operators for logarithmic and exponential computations:

| Operator | Description |
|---|---|
| `$log` | Logarithm of a number to a specified base |
| `$log10` | Base-10 logarithm |
| `$ln` | Natural logarithm (base e) |
| `$pow` | Raises a number to a specified exponent |
| `$exp` | Returns e raised to the specified exponent |
| `$sqrt` | Square root |

## Syntax

```javascript
{ $log:   [ <number>, <base> ] }   // log_base(number)
{ $log10: <number> }               // log_10(number)
{ $ln:    <number> }               // ln(number) = log_e(number)
{ $pow:   [ <number>, <exponent> ] }
{ $exp:   <exponent> }             // e^exponent
{ $sqrt:  <number> }               // sqrt(number)
```

All operators return `null` if the input is `null`. `$log`, `$log10`, `$ln`, and `$sqrt` return an error for invalid inputs (e.g., log of a negative number or zero).

## Examples

### Input Documents

```javascript
[
  { _id: 1, label: "A", value: 100,  growth: 0.08, principal: 1000, years: 5 },
  { _id: 2, label: "B", value: 1000, growth: 0.12, principal: 5000, years: 3 },
  { _id: 3, label: "C", value: 256,  growth: 0.05, principal: 2000, years: 10 }
]
```

### Example 1 - $pow: Compound Interest

Calculate compound interest: `A = P * (1 + r)^n`:

```javascript
db.investments.aggregate([
  {
    $project: {
      label: 1,
      principal: 1,
      growth: 1,
      years: 1,
      finalAmount: {
        $round: [
          {
            $multiply: [
              "$principal",
              { $pow: [{ $add: [1, "$growth"] }, "$years"] }
            ]
          },
          2
        ]
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, label: "A", finalAmount: 1469.33 },  // 1000 * (1.08)^5
  { _id: 2, label: "B", finalAmount: 7024.64 },  // 5000 * (1.12)^3
  { _id: 3, label: "C", finalAmount: 3257.79 }   // 2000 * (1.05)^10
]
```

### Example 2 - $sqrt: Euclidean Distance

Calculate distance from origin (0,0) to point (x, y):

```javascript
// Input: { _id: 1, x: 3, y: 4 }
db.points.aggregate([
  {
    $project: {
      distance: {
        $sqrt: {
          $add: [
            { $pow: ["$x", 2] },
            { $pow: ["$y", 2] }
          ]
        }
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, distance: 5 }  // sqrt(3^2 + 4^2) = sqrt(25) = 5
]
```

### Example 3 - $log10: Log Scale Values

Compute log-10 of the `value` field (useful for log-scale charts):

```javascript
db.investments.aggregate([
  {
    $project: {
      label: 1,
      value: 1,
      logValue: { $round: [{ $log10: "$value" }, 3] }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, label: "A", value: 100,  logValue: 2     },
  { _id: 2, label: "B", value: 1000, logValue: 3     },
  { _id: 3, label: "C", value: 256,  logValue: 2.408 }
]
```

### Example 4 - $ln: Natural Logarithm

Calculate the continuously compounded return: `ln(A/P) / t`:

```javascript
// Input: { _id: 1, startValue: 1000, endValue: 1500, years: 3 }
db.returns.aggregate([
  {
    $project: {
      continuousReturn: {
        $divide: [
          { $ln: { $divide: ["$endValue", "$startValue"] } },
          "$years"
        ]
      }
    }
  }
])
```

### Example 5 - $log: Custom Base

Compute the base-2 logarithm (number of bits needed):

```javascript
db.investments.aggregate([
  {
    $project: {
      label: 1,
      value: 1,
      bitsNeeded: {
        $ceil: { $log: ["$value", 2] }
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, label: "A", value: 100,  bitsNeeded: 7  },  // log2(100) = 6.64, ceil = 7
  { _id: 2, label: "B", value: 1000, bitsNeeded: 10 },  // log2(1000) = 9.97, ceil = 10
  { _id: 3, label: "C", value: 256,  bitsNeeded: 8  }   // log2(256) = 8, ceil = 8
]
```

### Example 6 - $exp: Exponential Decay

Model radioactive decay: `remaining = initial * e^(-lambda * t)`:

```javascript
// Input: { _id: 1, initial: 1000, lambda: 0.1, time: 5 }
db.decay.aggregate([
  {
    $project: {
      remaining: {
        $round: [
          {
            $multiply: [
              "$initial",
              {
                $exp: {
                  $multiply: [-1, "$lambda", "$time"]
                }
              }
            ]
          },
          2
        ]
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, remaining: 606.53 }  // 1000 * e^(-0.5) = 606.53
]
```

### Example 7 - Signal Strength in dB

Convert linear power ratio to decibels: `dB = 10 * log10(power ratio)`:

```javascript
// Input: { _id: 1, signal: 50, noise: 1 }
db.signals.aggregate([
  {
    $project: {
      snrDb: {
        $round: [
          { $multiply: [10, { $log10: { $divide: ["$signal", "$noise"] } }] },
          2
        ]
      }
    }
  }
])
```

Output:

```javascript
[
  { _id: 1, snrDb: 16.99 }  // 10 * log10(50) = 16.99 dB
]
```

## Use Cases

- Compound interest and investment growth projections
- Geometric distance calculations in spatial analysis
- Logarithmic scaling for charts and visualizations
- Signal-to-noise ratio calculations in dB
- Information theory and entropy calculations
- Exponential decay modeling (radioactive decay, depreciation)

## Summary

MongoDB's `$pow`, `$sqrt`, `$log`, `$log10`, `$ln`, and `$exp` operators bring scientific and financial math capabilities directly into the aggregation pipeline. Use `$pow` for compound growth calculations, `$sqrt` for distance formulas, `$log10` and `$ln` for logarithmic transformations, and `$exp` for exponential models. Combine with `$round` to control output precision.
