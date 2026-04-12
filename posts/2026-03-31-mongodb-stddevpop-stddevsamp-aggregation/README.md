# How to Use $stdDevPop and $stdDevSamp in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Statistics, $stdDevPop, $stdDevSamp

Description: Learn how to calculate population and sample standard deviation in MongoDB aggregation pipelines using $stdDevPop and $stdDevSamp operators.

---

Standard deviation measures how spread out values are from the mean. MongoDB provides two aggregation operators for this: `$stdDevPop` for population standard deviation and `$stdDevSamp` for sample standard deviation.

## $stdDevPop vs $stdDevSamp

- **$stdDevPop** - use when the data represents the entire population you care about
- **$stdDevSamp** - use when the data is a sample drawn from a larger population (adds Bessel's correction for unbiased estimation)

For most analytical workloads where you have a subset of data, `$stdDevSamp` is the statistically correct choice.

## Using $stdDevPop in $group

Calculate the standard deviation of response times across all requests per endpoint:

```javascript
db.requests.aggregate([
  {
    $group: {
      _id: "$endpoint",
      avgMs: { $avg: "$responseTimeMs" },
      stdDevMs: { $stdDevPop: "$responseTimeMs" },
      count: { $sum: 1 }
    }
  },
  { $sort: { stdDevMs: -1 } }
])
```

Sample output:

```text
{ _id: "/api/search", avgMs: 145, stdDevMs: 87.3, count: 10000 }
{ _id: "/api/users", avgMs: 23, stdDevMs: 4.1, count: 50000 }
```

High standard deviation signals inconsistent performance worth investigating.

## Using $stdDevSamp in $group

For a sample of sensor readings, estimate the standard deviation of the broader sensor population:

```javascript
db.sensorReadings.aggregate([
  {
    $group: {
      _id: "$sensorId",
      meanTemp: { $avg: "$temperature" },
      sampleStdDev: { $stdDevSamp: "$temperature" }
    }
  }
])
```

## Using in $setWindowFields

Both operators can be used in `$setWindowFields`, not just `$group`. This allows per-document deviation relative to a sliding window:

```javascript
db.salesData.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$region",
      sortBy: { date: 1 },
      output: {
        rollingStdDev: {
          $stdDevSamp: "$amount",
          window: { documents: [-6, 0] }
        }
      }
    }
  }
])
```

This computes a rolling standard deviation over the current document and the 6 preceding documents, per region. For a true time-based window, use `range` with a `unit` instead of `documents`.

## Handling Null and Missing Values

Both operators ignore `null` values and missing fields. If all values in a group are null, the result is `null`. If only one document is in a group, `$stdDevSamp` returns `null` (cannot compute sample deviation from a single value), while `$stdDevPop` returns `0`.

```javascript
db.scores.aggregate([
  {
    $group: {
      _id: null,
      popStdDev: { $stdDevPop: "$score" },
      sampleStdDev: { $stdDevSamp: "$score" }
    }
  }
])
```

## Practical Use Cases

- **Performance monitoring** - flagging endpoints with high response time variance
- **Anomaly detection** - computing Z-scores to identify outliers (value minus mean, divided by std dev)
- **Quality control** - measuring measurement consistency in IoT sensor data
- **Financial analysis** - assessing volatility of transaction amounts

## Summary

`$stdDevPop` and `$stdDevSamp` bring statistical power into MongoDB aggregation pipelines. Use `$stdDevPop` for complete datasets and `$stdDevSamp` for samples. Combined with `$setWindowFields`, they enable rolling deviation calculations that are useful for time-series anomaly detection and performance analysis.
