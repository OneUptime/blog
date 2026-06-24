# How to Manage Atlas Search Index Lifecycle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Index, Lifecycle, Operation

Description: Learn how to create, update, rebuild, pause, and delete Atlas Search indexes using the Atlas UI, CLI, and Admin API for full index lifecycle management.

---

## Atlas Search Index States

An Atlas Search index moves through several states during its lifecycle:

```text
PENDING -> BUILDING -> READY
                    -> FAILED (if the index definition is invalid)
                    -> STALE  (if source data changes faster than replication)
READY   -> DELETING
```

You can monitor these states in the Atlas UI under Cluster > Search or via the API.

## Creating an Index

### Via the Atlas CLI

```bash
atlas clusters search indexes create \
  --clusterName MyCluster \
  --file index-definition.json
```

The `index-definition.json` file:

```json
{
  "name": "products-search",
  "collectionName": "products",
  "database": "shop",
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": { "type": "string", "analyzer": "lucene.english" },
      "category": { "type": "string", "analyzer": "lucene.keyword" },
      "price": { "type": "number" }
    }
  }
}
```

### Via the Atlas Admin API

```bash
curl -u "publicKey:privateKey" \
  -H "Content-Type: application/json" \
  --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/MyCluster/fts/indexes" \
  --data @index-definition.json
```

## Listing Indexes

```bash
atlas clusters search indexes list \
  --clusterName MyCluster \
  --db shop \
  --collection products
```

## Updating an Index

Updating a search index triggers a rebuild. The index remains READY and queryable during the rebuild using the old definition:

```bash
atlas clusters search indexes update <indexId> \
  --clusterName MyCluster \
  --file updated-index.json
```

You can also update the index definition in the Atlas UI by clicking the Edit button next to an index.

## Deleting an Index

```bash
atlas clusters search indexes delete <indexId> \
  --clusterName MyCluster
```

Deletion is immediate from a user perspective but physical cleanup happens asynchronously.

## Monitoring Index Status in Applications

Check if an index is READY before running queries:

```javascript
const { MongoClient } = require("mongodb");

async function waitForIndexReady(db, collectionName, indexName, maxWaitMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const indexes = await db.collection(collectionName).listSearchIndexes(indexName).toArray();
    if (indexes.length > 0 && indexes[0].status === "READY") return true;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`Index ${indexName} not READY after ${maxWaitMs}ms`);
}
```

## Summary

Managing the Atlas Search index lifecycle involves creating indexes with JSON definitions via the CLI or Admin API, monitoring their transition through PENDING, BUILDING, and READY states, updating them (which triggers a live rebuild), and deleting them when no longer needed. Always verify index status before depending on search results in your application, especially after deployments that include index updates.
