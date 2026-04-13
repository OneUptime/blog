# How to Use Atlas Online Archive for Cold Data Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Online Archive, Cold Storage, Data Tiering

Description: Use MongoDB Atlas Online Archive to automatically tier cold data to low-cost object storage while keeping it queryable through a unified federated endpoint.

---

## What Is Cold Data?

Cold data is data accessed rarely or not at all after a certain age - historical logs, completed transactions, old audit records, archived IoT readings. Keeping cold data on an M30+ Atlas cluster costs significantly more than storing it in object storage.

Atlas Online Archive solves this by transparently moving cold data to cloud storage while keeping it queryable.

## Cost Comparison

| Storage Type | Approx. Cost (AWS) |
|---|---|
| Atlas M30 (10GB included) | ~$0.25/GB/month on cluster |
| Atlas Online Archive (cold) | ~$0.023/GB/month |
| Query cost | Per GB of data scanned |

For large datasets, Online Archive can reduce storage costs by 10x or more.

## Prerequisites

- Atlas M10 or higher cluster
- A collection with data that has a clear age threshold for archiving

## Step 1: Identify Archivable Data

Analyze how your data is accessed by age:

```javascript
// Find the oldest documents still being queried
db.system.profile.aggregate([
  { $match: { "command.filter.createdAt": { $exists: true } } },
  { $group: {
    _id: null,
    oldestQueried: { $min: "$command.filter.createdAt.$gte" }
  }}
])
```

A common pattern: data older than 90 days is rarely queried. Archive everything older than 90 days.

## Step 2: Configure Online Archive

In Atlas, navigate to **Cluster > Online Archive** and click **Configure Online Archive**:

```text
Database: appdb
Collection: events
Date Field: createdAt
Archive after: 90 days
```

## Step 3: Configure via API with Partition Optimization

Partition fields determine how archived data is organized in object storage. Choose fields you filter on:

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/onlineArchives" \
  --header "Content-Type: application/json" \
  --data '{
    "dbName": "appdb",
    "collName": "events",
    "criteria": {
      "type": "DATE",
      "dateField": "createdAt",
      "expireAfterDays": 90
    },
    "partitionFields": [
      { "fieldName": "createdAt", "order": 0, "fieldType": "date" },
      { "fieldName": "type",      "order": 1, "fieldType": "string" },
      { "fieldName": "userId",    "order": 2, "fieldType": "string" }
    ]
  }'
```

## Step 4: Query Both Live and Archived Data

After archiving starts, use the federated endpoint to query all data transparently:

```javascript
// This query spans live cluster data AND archived data
db.events.find({
  createdAt: { $gte: new Date("2023-01-01"), $lte: new Date("2024-01-01") },
  type: "PURCHASE"
}).limit(50)
```

MongoDB routes the query appropriately - recent data from the cluster, older data from the archive.

## Step 5: Force Archive-Only Queries

To query only archived data (avoiding cluster scan):

```javascript
// Filter by dates older than the archive threshold to target archived data
db.events.aggregate([
  {
    $match: {
      createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      type: "ERROR"
    }
  },
  { $group: { _id: "$userId", errorCount: { $sum: 1 } } },
  { $sort: { errorCount: -1 } },
  { $limit: 20 }
])
```

## Step 6: Use Custom Query-Based Archiving

Instead of date-based archiving, use a custom query for more flexibility:

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/onlineArchives" \
  --header "Content-Type: application/json" \
  --data '{
    "dbName": "appdb",
    "collName": "orders",
    "criteria": {
      "type": "CUSTOM",
      "query": "{\"status\": \"COMPLETED\", \"completedAt\": {\"$lt\": {\"$date\": {\"$numberLong\": \"TIMESTAMP_MS\"}}}}"
    },
    "partitionFields": [
      { "fieldName": "completedAt", "order": 0, "fieldType": "date" }
    ]
  }'
```

## Step 7: Monitor Archive Status and Statistics

```bash
# List all archives and their stats
curl --user "publicKey:privateKey" --digest \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/onlineArchives"
```

Response includes:
```json
{
  "state": "ACTIVE",
  "stats": {
    "bytesArchived": 104857600,
    "numDocuments": 500000
  }
}
```

## Step 8: Pause or Delete Archives

Pause without losing archived data:

```bash
curl --user "publicKey:privateKey" --digest \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/onlineArchives/{archiveId}" \
  --header "Content-Type: application/json" \
  --data '{"paused": true}'
```

Deleting an archive permanently deletes archived data - use caution.

## Best Practices

- Always include the date partition field as the first partition field
- Choose partition fields matching your most common query filters
- Monitor query performance on archived data - scans are slower than cluster queries
- Keep at least 30 days of data on the cluster for fast operational queries
- Use Online Archive alongside TTL indexes: TTL for truly disposable data, archive for data you must retain

## Summary

Atlas Online Archive automatically moves documents matching your criteria to cost-effective object storage while keeping them queryable through a federated endpoint. Configure date-based or custom archiving rules, optimize query performance with partition fields, and query both live and archived data with a single connection string. The result is significant storage cost reduction with no loss of historical data access.
