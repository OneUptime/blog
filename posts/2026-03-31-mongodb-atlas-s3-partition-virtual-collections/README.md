# How to Map S3 Partitions to Virtual Collections in Atlas Data Federation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Data Federation, S3

Description: Map Hive-style S3 partition paths to virtual collections in MongoDB Atlas Data Federation to query partitioned data efficiently using MQL filter pushdown.

---

S3 data lakes often organize files using Hive-style partitioning: `s3://bucket/events/year=2024/month=01/day=15/*.json`. Atlas Data Federation can parse these partition paths and push MQL filter conditions down to the S3 prefix, skipping files that don't match the query.

## Why Partition Mapping Matters

Without partition mapping, a query like `{ year: "2024", month: "01" }` would scan all files in the S3 store. With proper partition mapping, Atlas uses the path structure to only read files under `events/year=2024/month=01/`, reducing S3 GET requests and data transfer significantly.

## Storage Configuration with Partition Fields

Define partition attributes in the `path` using `{attribute}` placeholders:

```json
{
  "databases": [
    {
      "name": "datalake",
      "collections": [
        {
          "name": "events",
          "dataSources": [
            {
              "storeName": "s3-store",
              "path": "/events/year={year}/month={month}/day={day}/{filename}",
              "defaultFormat": ".json"
            }
          ]
        }
      ]
    }
  ],
  "stores": [
    {
      "name": "s3-store",
      "provider": "s3",
      "region": "us-east-1",
      "bucket": "my-data-lake"
    }
  ]
}
```

The `{year}`, `{month}`, `{day}` placeholders become virtual fields on each document that Atlas can use for filter pushdown.

## Querying with Partition Fields

Once partition fields are mapped, use them in `$match` to trigger pushdown:

```javascript
// Only reads files under events/year=2024/month=01/day=15/
db.events.find({
  year: "2024",
  month: "01",
  day: "15"
})

// Aggregation with partition filter
db.events.aggregate([
  {
    $match: {
      year: "2024",
      month: { $in: ["11", "12"] }  // reads only November and December
    }
  },
  {
    $group: {
      _id: "$eventType",
      count: { $sum: 1 }
    }
  }
])
```

## Numeric vs String Partitions

By default, partition values are strings. You can cast them to integers using a `{partitionName : int}` syntax to enable range queries:

```json
{
  "path": "/metrics/year={year : int}/month={month : int}/day={day : int}/{filename}"
}
```

Now you can filter with numeric comparisons:

```javascript
db.metrics.find({ year: 2024, month: { $gte: 6 } })
// Only reads files from month=6 through month=12
```

## Wildcard Partition Segments

Use `*` to match any path segment when you don't need to filter on that level:

```json
{
  "path": "/logs/{region}/{year}/{month}/*.log.gz"
}
```

This maps `region`, `year`, and `month` as virtual fields while accepting any path structure at the `{region}` level.

## Verifying Partition Pushdown

Check the execution stats to confirm pushdown is working:

```javascript
db.events.explain("executionStats").find({ year: "2024", month: "01" })
```

Look for `partitionFilterApplied: true` and a low `nFilesScanned` value in the output.

## Multiple Partition Styles

If you have both Hive-style (`year=2024`) and date-path style (`2024/01/15`) files, create two data sources pointing to the same collection:

```json
{
  "name": "events",
  "dataSources": [
    {
      "storeName": "s3-store",
      "path": "/events/year={year}/month={month}/{filename}",
      "defaultFormat": ".json"
    },
    {
      "storeName": "s3-store",
      "path": "/events-legacy/{year}/{month}/{filename}",
      "defaultFormat": ".json.gz"
    }
  ]
}
```

## Summary

Mapping S3 partition paths in Atlas Data Federation enables filter pushdown that dramatically reduces the number of S3 files scanned per query. Define partition fields as `{fieldName}` placeholders in the path, use numeric typing for integer comparisons, and verify pushdown is active via explain output. This can reduce query costs and latency by orders of magnitude on large partitioned datasets.
