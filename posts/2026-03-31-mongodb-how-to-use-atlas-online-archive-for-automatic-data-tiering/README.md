# How to Use Atlas Online Archive for Automatic Data Tiering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Online Archive, Data Tiering, Cost Optimization

Description: Learn how to configure MongoDB Atlas Online Archive to automatically move aging data to low-cost object storage while keeping it queryable.

---

## What Is Atlas Online Archive

Atlas Online Archive automatically moves infrequently accessed documents from your Atlas cluster to fully managed, cost-effective object storage (S3-compatible). Archived data remains queryable via the federated database instance endpoint.

## How It Works

1. You define an archiving rule based on a date field and age threshold
2. Atlas moves matching documents to cloud object storage
3. Both live and archived data are queryable via the federated endpoint
4. Archived documents are removed from the primary cluster

## Prerequisites

- MongoDB Atlas cluster (M10 or higher)
- A collection with a Date field suitable for archiving criteria

## Configuring Online Archive via Atlas UI

1. Go to your cluster in Atlas
2. Click "..." menu and select "Online Archive"
3. Click "Configure Online Archive"
4. Select the database and collection
5. Set the archiving criteria:

```text
Database: mydb
Collection: events
Date Field: createdAt
Age (days): 90  // archive documents older than 90 days
```

## Configuring via Atlas API

```bash
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/onlineArchives" \
  --digest -u "{publicKey}:{privateKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "collName": "events",
    "criteria": {
      "type": "DATE",
      "dateField": "createdAt",
      "dateFormat": "ISODATE",
      "expireAfterDays": 90
    },
    "dbName": "mydb",
    "partitionFields": [
      { "fieldName": "createdAt", "order": 0 },
      { "fieldName": "userId", "order": 1 }
    ]
  }'
```

## Querying Archived Data

Use the federated database endpoint to query both live and archived data:

```javascript
// Connect to federated endpoint
const client = new MongoClient(
  "mongodb+srv://<federated-endpoint>.mongodb.net/"
)

// Query runs across live cluster and archive transparently
const results = await db.collection("events").find({
  userId: "user123",
  createdAt: { $gte: new Date("2025-01-01") }
}).toArray()
```

## Partition Fields for Query Performance

Partition fields determine how archived data is organized in object storage. Choose fields commonly used in queries to avoid full archive scans:

```json
"partitionFields": [
  { "fieldName": "region", "order": 0 },
  { "fieldName": "createdAt", "order": 1 },
  { "fieldName": "customerId", "order": 2 }
]
```

## Custom Archiving Criteria

For non-date-based archiving, use custom criteria:

```json
{
  "type": "CUSTOM",
  "query": "{ \"status\": \"completed\", \"updatedAt\": { \"$lt\": { \"$date\": \"2025-01-01T00:00:00Z\" } } }"
}
```

## Monitoring Archive Status

```bash
curl -X GET \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/onlineArchives" \
  --digest -u "{publicKey}:{privateKey}"
```

## Summary

Atlas Online Archive reduces storage costs by automatically tiering old documents to object storage based on date or custom criteria. Archived data stays queryable via the federated endpoint. Choosing the right partition fields ensures archived queries perform well without scanning the full archive.
