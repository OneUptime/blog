# How to Use MongoDB Atlas Data Federation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Data Federation, S3, Query

Description: Learn how to use MongoDB Atlas Data Federation to query data stored in S3, Atlas clusters, and Atlas Online Archive with a single MQL or SQL interface.

---

## What Is Atlas Data Federation

Atlas Data Federation is a query engine that lets you run MongoDB Query Language (MQL) and SQL queries across data stored in multiple sources: MongoDB Atlas clusters, Atlas Online Archive, Amazon S3, Azure Blob Storage, and Google Cloud Storage. You do not move data; the query is pushed down to the storage layer.

```mermaid
flowchart TD
    Client[Application / BI Tool] --> Fed[Atlas Data Federation Endpoint]
    Fed --> Atlas[Atlas Cluster\n(hot data)]
    Fed --> Archive[Atlas Online Archive\n(warm data)]
    Fed --> S3["Amazon S3\n(cold data / data lake)"]
    Fed --> GCS[Google Cloud Storage]
    Fed --> ABS[Azure Blob Storage]
    Fed --> Results[Unified query results]
```

## Step 1: Create a Federated Database Instance

1. In Atlas UI navigate to **Data Federation** in the left sidebar.
2. Click **Create a Federated Database Instance**.
3. Give it a name (e.g., `FederatedDW`).
4. Add data stores: choose your Atlas cluster, S3 buckets, or Online Archive.

The connection string looks like a standard MongoDB URI:

```text
mongodb://federateddw-abcde.a.query.mongodb.net:27017/?authSource=%24external&tls=true
```

For federation the endpoint is provided in the Atlas UI under **Data Federation** > **Connect**.

## Step 2: Define the Storage Configuration (JSON)

Atlas Data Federation uses a JSON storage configuration that maps virtual databases and collections to physical storage locations.

```javascript
// Example storage configuration via Atlas Admin API
// POST /api/atlas/v2/groups/{groupId}/dataFederation

{
  "name": "FederatedDW",
  "storage": {
    "stores": [
      {
        "name": "s3-data-lake",
        "provider": "s3",
        "region": "us-east-1",
        "bucket": "my-company-data-lake",
        "delimiter": "/",
        "prefix": "events/"
      },
      {
        "name": "atlas-cluster",
        "provider": "atlas",
        "clusterName": "Cluster0",
        "projectId": "abc123"
      }
    ],
    "databases": [
      {
        "name": "analytics",
        "collections": [
          {
            "name": "events",
            "dataSources": [
              {
                "storeName": "s3-data-lake",
                "path": "/events/{year string}/{month string}/{day string}/",
                "defaultFormat": ".json.gz"
              }
            ]
          },
          {
            "name": "orders",
            "dataSources": [
              {
                "storeName": "atlas-cluster",
                "database": "production",
                "collection": "orders"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Step 3: Query S3 Data with MQL

```javascript
const { MongoClient } = require("mongodb");

// Connect to the Data Federation endpoint
const client = new MongoClient(process.env.ATLAS_FEDERATION_URI, {
  tls: true,
  authMechanism: "MONGODB-AWS"  // or SCRAM-SHA-256 with username/password
});

await client.connect();
const db = client.db("analytics");

// Query S3 JSON files as if they were a MongoDB collection
const eventCount = await db.collection("events").countDocuments({
  year: "2026",
  month: "03"
});

console.log(`Events in March 2026: ${eventCount}`);

// Aggregation across S3 data
const summary = await db.collection("events").aggregate([
  { $match: { year: "2026", month: "03", eventType: "purchase" } },
  { $group: { _id: "$country", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  { $sort: { total: -1 } },
  { $limit: 10 }
]).toArray();

console.log("Top countries by purchase revenue:", summary);
```

## Step 4: Cross-Source Joins with $lookup

Data Federation supports `$lookup` across different stores within the same federated database.

```javascript
// Join S3 events with Atlas orders in one query
const enriched = await db.collection("events").aggregate([
  { $match: { year: "2026", eventType: "purchase" } },
  {
    $lookup: {
      from: "orders",            // Atlas collection
      localField: "orderId",
      foreignField: "_id",
      as: "orderDetails"
    }
  },
  { $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      eventId: 1,
      userId: 1,
      amount: 1,
      "orderDetails.status": 1,
      "orderDetails.shippedAt": 1
    }
  },
  { $limit: 100 }
]).toArray();
```

## Step 5: Query Partitioned S3 Data Efficiently

Use the path template with partition attributes to let Data Federation skip irrelevant S3 prefixes (partition pruning).

```javascript
// Storage config with date partitioning
// path: "/logs/{year string}/{month string}/{day string}/"
// Query: specify partition values in $match to trigger pruning

const dailyLogs = await db.collection("logs").find({
  year: "2026",
  month: "03",
  day: "31"
}).toArray();
// Only reads S3 objects under /logs/2026/03/31/ - all other paths skipped
```

## Step 6: Write Query Results to S3 with $out

Data Federation supports `$out` to write aggregation results back to S3.

```javascript
// Aggregate and write the result to a new S3 path
await db.collection("events").aggregate([
  { $match: { year: "2026", month: "03" } },
  { $group: { _id: "$category", total: { $sum: "$amount" } } },
  {
    $out: {
      s3: {
        bucket: "my-company-data-lake",
        region: "us-east-1",
        filename: "summaries/2026-03-monthly-category.json",
        format: { name: "json" }
      }
    }
  }
]).toArray();
```

## Step 7: Use Atlas SQL Interface for BI Tools

Data Federation exposes an Atlas SQL endpoint that BI tools like Tableau, Power BI, and Looker can connect to via a JDBC/ODBC driver.

```sql
-- Run SQL queries on federated data
SELECT country, SUM(amount) AS total_revenue, COUNT(*) AS order_count
FROM analytics.orders
WHERE createdAt >= '2026-01-01'
GROUP BY country
ORDER BY total_revenue DESC
LIMIT 10;
```

## Common Use Cases

| Use case | Description |
|---|---|
| Data lake query | Query S3 Parquet/JSON without ETL |
| Hot/cold tiering | Query Atlas (hot) + Archive (cold) together |
| Cross-cluster reporting | Aggregate across multiple Atlas clusters |
| BI connector | Connect Tableau/Power BI to MongoDB data |
| S3 output | Write aggregation results back to S3 |

## Summary

MongoDB Atlas Data Federation creates a virtual query layer over Atlas clusters, S3, Atlas Online Archive, and other cloud storage. Define a storage configuration mapping virtual collections to physical data sources, connect via the federation endpoint, and query with standard MQL or SQL. Use path templates with partition attributes for efficient S3 scanning, `$lookup` for cross-source joins, and `$out` to write results back to S3.
