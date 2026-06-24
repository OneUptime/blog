# How to Use $out to Write Results to S3 from MongoDB Atlas Data Federation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Data Federation, S3

Description: Use the $out stage in MongoDB Atlas Data Federation aggregation pipelines to write query results back to S3 in JSON or CSV format for downstream processing.

---

Atlas Data Federation extends the standard `$out` aggregation stage to support writing results directly to S3. This allows you to run data transformation pipelines against your Atlas collections and persist the output in object storage for analytics, archiving, or downstream consumption.

## Prerequisites

Your Federated Database Instance (FDI) must have an S3 store configured, and the IAM role or access key used by the FDI must have `s3:PutObject` permission on the target bucket.

## Writing to S3 with $out

The `$out` stage in an FDI context accepts an `s3` target specification:

```javascript
db.orders.aggregate([
  {
    $match: {
      status: "completed",
      createdAt: {
        $gte: ISODate("2024-01-01"),
        $lt: ISODate("2024-02-01")
      }
    }
  },
  {
    $group: {
      _id: "$customerId",
      totalSpend: { $sum: "$amount" },
      orderCount: { $sum: 1 }
    }
  },
  {
    $out: {
      s3: {
        bucket: "my-analytics-bucket",
        region: "us-east-1",
        filename: "customer-summary/2024-01/part",
        format: {
          name: "json",
          maxFileSize: "100MB"
        }
      }
    }
  }
])
```

## Supported Output Formats

```text
json      - MongoDB Extended JSON (one document per line)
json.gz   - Gzip-compressed JSON
csv       - Comma-separated, headers from field names
csv.gz    - Gzip-compressed CSV
tsv       - Tab-separated values
tsv.gz    - Gzip-compressed TSV
bson      - BSON binary format
bson.gz   - Gzip-compressed BSON
parquet   - Apache Parquet columnar format (best for analytics)
```

Parquet is the recommended format for downstream analytics tools:

```javascript
{
  $out: {
    s3: {
      bucket: "data-lake",
      region: "us-east-1",
      filename: "transformed/output",
      format: {
        name: "parquet",
        maxFileSize: "256MB"
      }
    }
  }
}
```

## Dynamic Path Construction

Build date-based paths programmatically for automatic partitioning in S3. In `mongosh`, construct the filename before passing it to the pipeline:

```javascript
var now = new Date();
var datePath = "reports/" + now.getUTCFullYear() + "/" +
  String(now.getUTCMonth() + 1).padStart(2, "0") + "/" +
  String(now.getUTCDate()).padStart(2, "0") + "/summary";

db.orders.aggregate([
  { $match: { status: "completed" } },
  {
    $out: {
      s3: {
        bucket: "data-lake",
        region: "us-east-1",
        filename: datePath,
        format: { name: "json" }
      }
    }
  }
])
```

You can also use an aggregation expression in the `filename` field to partition output by a document field:

```javascript
{
  $out: {
    s3: {
      bucket: "data-lake",
      region: "us-east-1",
      filename: { $concat: ["reports/", { $toString: "$region" }, "/output"] },
      format: { name: "json" }
    }
  }
}
```

## Writing from Atlas Collection to S3

Chain an Atlas cluster source with S3 output for an ETL pipeline:

```javascript
// Connect to FDI, query Atlas collection, write to S3
db.getSiblingDB("production").getCollection("events").aggregate([
  { $match: { processed: false } },
  {
    $project: {
      userId: 1,
      eventType: 1,
      timestamp: 1,
      properties: 1
    }
  },
  {
    $out: {
      s3: {
        bucket: "event-archive",
        region: "us-east-1",
        filename: "events/unprocessed/" + new Date().toISOString().slice(0, 10),
        format: { name: "json", maxFileSize: "50MB" }
      }
    }
  }
])
```

## Running $out Pipelines Programmatically

Schedule the export using Python:

```python
from pymongo import MongoClient
from datetime import datetime

client = MongoClient("mongodb://fdi-connection-string/")
db = client["production"]

def export_daily_summary():
    today = datetime.utcnow()
    db.orders.aggregate([
        {"$match": {
            "createdAt": {
                "$gte": datetime(today.year, today.month, today.day)
            }
        }},
        {"$group": {
            "_id": "$category",
            "revenue": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$out": {
            "s3": {
                "bucket": "reports-bucket",
                "region": "us-east-1",
                "filename": f"daily/{today.strftime('%Y/%m/%d')}/summary",
                "format": {"name": "json"}
            }
        }}
    ])
    print(f"Export complete for {today.date()}")

export_daily_summary()
```

## Summary

The `$out` stage in Atlas Data Federation writes aggregation results to S3 in multiple formats including JSON, CSV, and Parquet. Construct date-based paths programmatically or use aggregation expressions in the `filename` field for partitioned output. This enables you to run complex transformations in MongoDB's aggregation language and materialize the results in a data lake without separate ETL tooling.
