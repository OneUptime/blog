# How to Use Atlas Online Archive to Reduce Storage Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Online Archive, Storage Cost, Data Tiering

Description: Learn how to configure Atlas Online Archive to move aging data to low-cost object storage and significantly reduce your Atlas cluster storage bills.

---

## Why Online Archive Reduces Costs

Atlas cluster storage (SSD-backed) costs approximately 10-30x more per GB than object storage. Moving cold data - data older than 30-90 days - to Online Archive can reduce storage costs dramatically while keeping the data queryable.

## How Cost Reduction Works

- Live cluster: ~$0.25/GB/month (NVMe SSD)
- Online Archive: ~$0.023/GB/month (object storage)

Moving 1TB of historical data can save over $200/month.

## Setting Up Online Archive for Cost Savings

1. Identify which collections have data that grows unboundedly (logs, events, metrics)
2. Determine the age threshold beyond which data is rarely accessed
3. Configure archiving for those collections

```bash
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/onlineArchives" \
  --digest -u "{publicKey}:{privateKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "collName": "application_logs",
    "criteria": {
      "type": "DATE",
      "dateField": "timestamp",
      "dateFormat": "ISODATE",
      "expireAfterDays": 60
    },
    "dbName": "myapp",
    "partitionFields": [
      { "fieldName": "timestamp", "order": 0 },
      { "fieldName": "service", "order": 1 }
    ]
  }'
```

## Choosing Collections to Archive

Target collections with:
- Continuous append-only writes (logs, events, audit trails)
- Date-based queries that rarely look at old data
- Large and growing storage footprint

```javascript
// Find top collections by storage usage
db.stats()

// More detail per collection
db.adminCommand({ listDatabases: 1 }).databases.forEach(d => {
  const db2 = db.getSiblingDB(d.name);
  db2.getCollectionNames().forEach(c => {
    const s = db2.getCollection(c).stats();
    if (s.storageSize > 100 * 1024 * 1024) { // > 100MB
      print(`${d.name}.${c}: ${(s.storageSize/1024/1024).toFixed(0)} MB`);
    }
  });
})
```

## Monitoring Archive Progress

```bash
# Check archive status
curl -X GET \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/onlineArchives/{archiveId}" \
  --digest -u "{publicKey}:{privateKey}" | jq '.state'
```

States: `PENDING`, `ACTIVE`, `PAUSED`, `DELETED`

## Querying Archived Data

Use the federated database connection string to query both live and archived data:

```javascript
// Same queries work against both live cluster and archive
db.application_logs.find({
  service: "api",
  timestamp: {
    $gte: new Date("2025-01-01"),
    $lt: new Date("2025-04-01")
  }
}).limit(100)
```

## Pausing and Resuming Archiving

```bash
# Pause archiving (data stays in archive, new data stops being moved)
curl -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/onlineArchives/{archiveId}" \
  --digest -u "{publicKey}:{privateKey}" \
  -H "Content-Type: application/json" \
  -d '{ "paused": true }'
```

## Expected Storage Savings

```text
Before Online Archive:
- live_logs collection: 500GB @ $0.25/GB = $125/month

After 60-day archiving rule (assume 90% of data is cold):
- live_logs collection: 50GB @ $0.25/GB = $12.50/month
- archive: 450GB @ $0.023/GB = $10.35/month
- Total: $22.85/month (82% savings)
```

## Summary

Atlas Online Archive reduces storage costs by automatically moving data older than a configured age threshold from expensive SSD-backed cluster storage to low-cost object storage. Target append-only collections like logs and events. The savings can be substantial - often 70-85% for workloads with large volumes of aging data.
