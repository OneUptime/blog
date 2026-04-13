# How to Configure Federated Database Instances in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Data Federation, Data Architecture

Description: Configure a MongoDB Atlas Federated Database Instance to query S3, Atlas clusters, and HTTP endpoints from a single connection string using MQL.

---

Atlas Data Federation lets you create a Federated Database Instance (FDI) - a virtual database that maps data sources like S3 buckets, Atlas clusters, and HTTP endpoints to queryable collections. You write standard MongoDB queries; Data Federation routes them to the right source.

## Creating a Federated Database Instance

In the Atlas UI, go to Data Federation and click Create Federated Database. Alternatively, use the Atlas CLI:

```bash
atlas dataFederation create my-fdi \
  --region US_EAST_1 \
  --projectId <project-id>
```

## Storage Configuration

The FDI storage configuration defines what data sources map to which virtual databases and collections. You can set this via the UI or the Atlas Admin API:

```json
{
  "databases": [
    {
      "name": "analytics",
      "collections": [
        {
          "name": "events",
          "dataSources": [
            {
              "storeName": "s3-store",
              "path": "/events/{year}/{month}/{day}/*.json.gz",
              "defaultFormat": ".json.gz"
            }
          ]
        },
        {
          "name": "users",
          "dataSources": [
            {
              "storeName": "atlas-cluster",
              "database": "production",
              "collection": "users"
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
      "bucket": "my-data-bucket",
      "delimiter": "/",
      "prefix": "events/"
    },
    {
      "name": "atlas-cluster",
      "provider": "atlas",
      "clusterName": "my-production-cluster",
      "projectId": "<project-id>"
    }
  ]
}
```

## Connecting to Your FDI

The FDI has its own connection string separate from your Atlas cluster:

```bash
mongosh "mongodb+srv://<username>:<password>@<fdi-hostname>.mongodb.net/analytics"
```

You can find this connection string in the Atlas UI under Data Federation > Connect.

Or via driver:

```python
from pymongo import MongoClient

client = MongoClient("mongodb+srv://<fdi-hostname>.mongodb.net/analytics",
                     username="user", password="pass")
db = client["analytics"]
```

## Querying S3 Data

Once connected, query S3-backed collections with standard MQL:

```javascript
// Count events from a specific day
db.events.countDocuments({
  year: "2024",
  month: "01",
  day: "15"
})

// Aggregate over S3 JSON files
db.events.aggregate([
  { $match: { eventType: "purchase" } },
  { $group: { _id: "$userId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } },
  { $limit: 20 }
])
```

## Joining S3 Data with Atlas Collections

Query across data sources in a single pipeline:

```javascript
// Join S3 events with live Atlas user data
db.events.aggregate([
  { $match: { eventType: "signup" } },
  {
    $lookup: {
      from: "users",           // This maps to the Atlas cluster
      localField: "userId",
      foreignField: "_id",
      as: "userDetails"
    }
  },
  { $unwind: "$userDetails" },
  { $project: { userId: 1, "userDetails.email": 1, "userDetails.plan": 1 } }
])
```

## Supported File Formats for S3

```text
.json      - Newline-delimited JSON
.json.gz   - Compressed JSON
.bson      - BSON files
.bson.gz   - Compressed BSON
.csv       - Comma-separated values
.tsv       - Tab-separated values
.parquet   - Apache Parquet (columnar)
.orc       - Apache ORC (columnar)
.avro      - Apache Avro
```

## Setting Data Federation Regions

Choose the FDI region closest to your primary S3 bucket to minimize data transfer costs. You cannot change the region after creation.

## Summary

MongoDB Atlas Federated Database Instances let you query S3, Atlas clusters, and HTTP endpoints with standard MongoDB aggregation pipelines from a single connection string. Define data sources and virtual collections in the storage configuration, connect using the FDI connection string, and use `$lookup` to join data across sources. This avoids ETL pipelines for analytical queries across multiple data stores.
