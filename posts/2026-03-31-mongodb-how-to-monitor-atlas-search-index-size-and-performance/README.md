# How to Monitor Atlas Search Index Size and Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Full-Text Search, Monitoring, Performance

Description: Learn how to monitor MongoDB Atlas Search index size, query performance, and resource utilization using Atlas metrics, the $searchMeta stage, and Atlas APIs.

---

## Overview of Atlas Search Monitoring

MongoDB Atlas Search runs a separate Lucene-based search process (mongot) alongside mongod. Monitoring Atlas Search involves tracking:
- Index size on disk and in memory
- Query latency and throughput
- Index build status and replication lag
- Resource utilization of the search process

## Checking Index Status in the Atlas UI

Navigate to your Atlas cluster, click **Search** in the left sidebar, and view the index list. Each index shows:
- **Status** - Active, Building, Failed
- **Size** - disk space used
- **Documents Indexed** - count of indexed documents

## Using $searchMeta to Get Index Statistics

The `$searchMeta` aggregation stage returns metadata about search index usage:

```javascript
db.products.aggregate([
  {
    $searchMeta: {
      index: "default",
      count: {}
    }
  }
]);
```

Output:

```javascript
{ "count": { "lowerBound": 95000 } }
```

Get facet counts alongside search results using `$$SEARCH_META`:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      text: { query: "laptop", path: "name" }
    }
  },
  { $limit: 10 },
  {
    $facet: {
      results: [{ $project: { name: 1, price: 1 } }],
      meta: [{ $replaceWith: "$$SEARCH_META" }, { $limit: 1 }]
    }
  }
]);
```

## Atlas Search Metrics via Atlas API

List available search metrics:

```bash
curl --digest -u "publicKey:privateKey" \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/fts/metrics" \
  | jq '.measurements[].name'
```

Fetch a specific metric (e.g., index size):

```bash
curl --digest -u "publicKey:privateKey" \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/fts/metrics/measurements?granularity=PT1H&period=P1D&metrics=SEARCH_INDEX_SIZE" \
  | jq '.measurements[]'
```

Key metrics to track:

| Metric | Description |
|---|---|
| `SEARCH_INDEX_SIZE` | Total disk size of all search indexes |
| `SEARCH_REQUIRED_MEMORY_SIZE` | Memory required by search indexes |
| `SEARCH_MAX_REPLICATION_LAG` | Lag between mongod writes and search index updates |
| `SEARCH_OPCOUNTER_QUERY` | Number of search queries per second |
| `SEARCH_PROCESS_CPU_KERNEL` | CPU used by mongot process |
| `SEARCH_PROCESS_MEMORY_RESIDENT` | RAM used by mongot process |

## Monitoring Replication Lag

Replication lag measures how far behind the Atlas Search index is from the latest writes. High lag means search results are stale:

```bash
curl --digest -u "publicKey:privateKey" \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/fts/metrics/measurements?granularity=PT1M&period=PT1H&metrics=SEARCH_MAX_REPLICATION_LAG"
```

Target: replication lag should stay under 60 seconds for near-real-time search.

## Using Atlas Search Explain

The `explain` option on `$search` returns query execution details:

```javascript
db.products.explain("executionStats").aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "laptop gaming",
        path: { wildcard: "*" }
      }
    }
  },
  { $limit: 10 }
]);
```

Look for:
- `executionTimeMillisEstimate` - time spent in each pipeline stage
- `nReturned` - documents returned from the search stage
- `$_internalSearchMongotRemote` - the internal stage representing mongot execution
- `$_internalSearchIdLookup` - the stage where MongoDB fetches full documents by _id

## Setting Up Alerts for Atlas Search

In the Atlas UI under **Alerts**, create alert conditions for:
- `Search Max Replication Lag > 120 seconds`
- `Search Required Memory Size > 80% of available memory`
- `Search Index Build Failure`

Via the API:

```bash
curl -X POST --digest -u "publicKey:privateKey" \
  -H "Content-Type: application/json" \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/alertConfigs" \
  -d '{
    "eventTypeName": "SEARCH_INDEX_WRITE_FAILED",
    "enabled": true,
    "notifications": [
      { "typeName": "EMAIL", "emailAddress": "ops@example.com", "intervalMin": 5 }
    ]
  }'
```

## Optimizing Search Index Performance

Reduce index size by indexing only necessary fields:

```javascript
// Narrow index definition - only index what you query
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": { "type": "string", "analyzer": "lucene.standard" },
      "description": { "type": "string", "analyzer": "lucene.english" },
      "category": { "type": "stringFacet" },
      "price": { "type": "number" }
    }
  }
}
```

Avoid `dynamic: true` in production - it indexes every field, consuming significant disk and memory.

## Summary

Monitor Atlas Search index health through the Atlas UI, the `$searchMeta` aggregation stage, and the Atlas Monitoring API. Key metrics are index size, replication lag, and mongot CPU/memory usage. Set alerts for replication lag above 2 minutes and memory pressure. Use narrow index definitions with `dynamic: false` to control index growth, and use `explain()` to diagnose slow search queries.
