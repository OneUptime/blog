# How to Archive Data from Atlas to S3 Using Online Archive in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Online Archive, S3, Data Tiering

Description: Learn how to configure MongoDB Atlas Online Archive to automatically move older documents to S3, reducing storage costs while keeping data queryable.

---

## What Is Atlas Online Archive?

Atlas Online Archive automatically moves infrequently accessed documents from your Atlas cluster to fully managed, cost-effective cloud object storage (backed by S3). Archived data remains queryable through Atlas Data Federation - you don't lose access to it.

This is ideal for time-series data, logs, audit records, and any data with a clear age threshold.

## How It Works

1. You define an archiving rule based on a date field
2. Atlas continuously evaluates documents against the rule
3. Documents meeting the criteria are moved to object storage
4. A federated endpoint is automatically created so you can query both live and archived data

## Prerequisites

- Atlas cluster M10 or higher (Online Archive is not available on Serverless or free tier)
- A collection with a date-based field suitable for archiving

## Step 1: Enable Online Archive in the Atlas UI

1. Navigate to your cluster in Atlas
2. Click **Online Archive** in the left sidebar
3. Click **Configure Online Archive**
4. Select the database and collection to archive

## Step 2: Define the Archiving Rule

Configure when documents should be archived. You can use a date field approach:

```text
Archive documents where the value of field "createdAt" is older than 90 days
```

Or use a custom query with a date expression. In the Atlas UI, select:
- **Date Field**: `createdAt`
- **Number of Days**: `90`

This archives documents where `createdAt < (now - 90 days)`.

## Step 3: Configure via Atlas Administration API

```bash
curl --user "publicKey:privateKey" --digest \
  --header "Content-Type: application/json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/onlineArchives" \
  --data '{
    "collName": "events",
    "dbName": "appdb",
    "criteria": {
      "type": "DATE",
      "dateField": "createdAt",
      "dateFormat": "ISODATE",
      "expireAfterDays": 90
    },
    "partitionFields": [
      {
        "fieldName": "createdAt",
        "order": 0,
        "fieldType": "date"
      },
      {
        "fieldName": "userId",
        "order": 1,
        "fieldType": "string"
      }
    ],
    "schedule": {
      "type": "DAILY",
      "startHour": 2,
      "startMinute": 0
    }
  }'
```

## Step 4: Set Partition Fields for Query Performance

Partition fields determine how data is organized in object storage and have a major impact on query performance. Choose fields you commonly filter on:

```json
{
  "partitionFields": [
    { "fieldName": "createdAt", "order": 0, "fieldType": "date" },
    { "fieldName": "region",    "order": 1, "fieldType": "string" },
    { "fieldName": "userId",    "order": 2, "fieldType": "string" }
  ]
}
```

Queries that filter on leading partition fields will scan far fewer files.

## Step 5: Query Archived Data

Once the archive is active, a federated database endpoint is created automatically. You can query it just like your normal cluster:

```javascript
// Connect to the federated endpoint (shown in Atlas UI)
// mongodb://myProject.myCluster.mongodb.net

// Query spans both live cluster and archive seamlessly
db.events.find({
  createdAt: { $gte: new Date("2023-01-01"), $lt: new Date("2023-06-01") },
  region: "us-east"
}).limit(100)
```

Atlas transparently routes queries to the right data store.

## Step 6: Monitor Archive Status

Check archiving progress and status:

```bash
curl --user "publicKey:privateKey" --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/onlineArchives"
```

Response includes:

```json
{
  "_id": "5ebad3c87cc5f925db2c6de5",
  "clusterName": "myCluster",
  "collName": "events",
  "dbName": "appdb",
  "paused": false,
  "state": "ACTIVE",
  "criteria": {
    "type": "DATE",
    "dateField": "createdAt",
    "expireAfterDays": 90
  }
}
```

## Step 7: Pause or Delete an Archive

To pause archiving temporarily:

```bash
curl --user "publicKey:privateKey" --digest \
  --header "Content-Type: application/json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/onlineArchives/{archiveId}" \
  --data '{"paused": true}'
```

## Cost Considerations

- Archived data is billed at object storage rates (much cheaper than Atlas cluster storage)
- Querying archived data incurs Data Federation compute costs
- There is no egress cost when querying from within the same cloud region

## Summary

Atlas Online Archive automatically moves aged documents from your cluster to cost-effective object storage while preserving queryability through a federated endpoint. Configure an archiving rule with a date field and expiry threshold, define partition fields matching your query patterns, and Atlas handles the rest - keeping hot data on the cluster and cold data in the archive, with seamless unified access to both.
