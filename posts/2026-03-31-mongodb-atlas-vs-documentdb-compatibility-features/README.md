# MongoDB Atlas vs Amazon DocumentDB: Compatibility and Feature Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, DocumentDB, AWS, Database

Description: Compare MongoDB Atlas and Amazon DocumentDB on wire protocol compatibility, supported features, performance, and cost for teams evaluating AWS-native database options.

---

## Overview

Amazon DocumentDB is a fully managed document database service on AWS that implements a subset of the MongoDB wire protocol (supporting versions 3.6, 4.0, 5.0, and 8.0). It is not MongoDB - it is a proprietary AWS service that aims for compatibility. MongoDB Atlas is the official managed MongoDB service, available on AWS, Azure, and GCP.

## Wire Protocol Compatibility

DocumentDB claims MongoDB compatibility, but it implements only a subset of the MongoDB API. While it supports up to MongoDB 5.0 and 8.0 compatibility modes, many MongoDB features remain unavailable.

Notable DocumentDB gaps as of 2026:

```text
Unsupported or limited in DocumentDB:
- $lookup with correlated subqueries (equality joins and uncorrelated subqueries only)
- Change streams (supported but with higher latency vs MongoDB)
- Aggregation: $facet, $unionWith (not supported); $bucket (supported in 8.0 only)
- Atlas Search and Vector Search (not available - Atlas only)
- Transactions (supported but with limits: 1-min timeout, 32MB log cap)
- Time-series collections (not supported)
- Slot-based query execution engine (not supported)
- Client-side field-level encryption (not supported)
- Text search ($text) - supported since DocumentDB 5.0 with limitations (English-only, no array field indexing)
```

To check compatibility, test your application against DocumentDB using the MongoDB driver:

```javascript
// Same driver, different endpoint
const client = new MongoClient(
  "mongodb://user:pass@docdb-cluster.us-east-1.docdb.amazonaws.com:27017/?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred"
);
```

## Aggregation Pipeline Support

MongoDB Atlas supports the full aggregation pipeline. DocumentDB has notable limitations:

```javascript
// Works in MongoDB Atlas, fails in DocumentDB (correlated $lookup and $facet unsupported)
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      let: { productIds: "$items.productId" },
      pipeline: [
        { $match: { $expr: { $in: ["$_id", "$$productIds"] } } },
        { $project: { name: 1, price: 1 } }
      ],
      as: "productDetails"
    }
  },
  { $facet: { byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }] } }
]);
```

## Performance

DocumentDB uses a distributed storage engine that separates compute from storage (similar to Aurora). This provides good read scaling via read replicas but can have higher write latency than MongoDB on equivalent hardware.

MongoDB Atlas uses the native WiredTiger engine, which is optimized for MongoDB's document access patterns.

```text
Approximate comparison on similar instance sizes:
- Simple point reads: DocumentDB slightly slower due to storage layer
- Aggregations: MongoDB Atlas faster (native engine)
- Read replicas: Both support, DocumentDB has up to 15 replicas
```

## Cost Comparison

```text
DocumentDB costs (us-east-1, approximate):
- db.r6g.large instance: ~$0.34/hr per instance
- Storage: $0.10/GB-month
- I/O: $0.20/million requests (can be significant)

MongoDB Atlas M30 (equivalent):
- ~$0.20/hr per node
- Storage: ~$0.25/GB-month
- No I/O charges
```

DocumentDB I/O charges can be surprising for write-heavy workloads. Atlas pricing is more predictable.

## Vendor Lock-In Considerations

DocumentDB is AWS-only and proprietary. Migrating away from DocumentDB requires data export and testing against your target database.

Atlas runs on AWS, Azure, and GCP with a consistent API, making multi-cloud and migration easier.

```bash
# Migrate from DocumentDB to MongoDB Atlas using mongodump
mongodump --uri="mongodb://docdb-endpoint:27017/mydb?ssl=true&replicaSet=rs0" \
  --out=/backup/docdb-export

mongorestore --uri="mongodb+srv://user:pass@atlas-cluster.mongodb.net/mydb" \
  /backup/docdb-export/mydb
```

## When to Use Each

Choose Amazon DocumentDB when: you are locked into AWS, need tight IAM integration, want a familiar face for basic MongoDB workloads, and do not need advanced aggregations or Atlas-specific features.

Choose MongoDB Atlas when: you need full MongoDB API compatibility, plan to use Atlas Search or Vector Search, want multi-cloud flexibility, or are running MongoDB 5.x+ workloads.

## Summary

Amazon DocumentDB is a reasonable choice for simple document storage within AWS if you only use the subset of MongoDB features that DocumentDB supports. For teams using modern MongoDB features, aggregation pipelines, Atlas Search, or multi-cloud deployments, MongoDB Atlas is the more capable and portable option.
