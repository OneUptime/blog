# Validation Summary: MongoDB Atlas vs Amazon DocumentDB: Compatibility and Feature Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Amazon DocumentDB (3.6, 4.0, 5.0, 8.0)
- MongoDB Atlas
- MongoDB wire protocol
- MongoDB aggregation pipeline ($lookup, $facet, $bucket, $unionWith)
- mongodump / mongorestore (MongoDB Database Tools)
- AWS (IAM, DocumentDB pricing)

## Sources Consulted
- AWS DocumentDB Supported MongoDB APIs documentation: https://docs.aws.amazon.com/documentdb/latest/developerguide/mongo-apis.html
- AWS DocumentDB Functional Differences documentation: https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html
- AWS DocumentDB Replication documentation: https://docs.aws.amazon.com/documentdb/latest/developerguide/replication.html
- AWS DocumentDB Pricing page: https://aws.amazon.com/documentdb/pricing/
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Atlas pricing documentation

## Issues Found

1. **Wire protocol version outdated (Overview and Wire Protocol sections):** The post stated DocumentDB implements "a subset of the MongoDB 4.0 wire protocol." DocumentDB now supports 3.6, 4.0, 5.0, and 8.0 compatibility modes. Fixed to reflect current supported versions.

2. **$lookup gap description imprecise:** The post said DocumentDB supports "only equality joins" for $lookup. DocumentDB actually supports equality joins and uncorrelated subqueries, but not correlated subqueries (i.e., $lookup with `let` referencing parent document fields). Fixed wording to be more precise.

3. **$bucket incorrectly listed as unsupported:** $bucket is supported in DocumentDB 8.0. Updated the gap list to note it is supported in 8.0.

4. **$text search incorrectly listed as "limited implementation":** $text was fully unsupported in early DocumentDB versions but was added in DocumentDB 5.0 (February 2024) with some limitations (English-only, no array field indexing). Updated to reflect current support status with caveats.

5. **Transaction description too vague:** The post said "limited" without specifics. Updated to mention concrete limits: 1-minute execution timeout and 32MB transaction log cap.

6. **Missing features in gap list:** Added client-side field-level encryption and slot-based query execution engine to the unsupported features list, and clarified Atlas Search includes Vector Search.

7. **DocumentDB pricing incorrect:** The post claimed db.r6g.large costs ~$0.25/hr. The actual on-demand price in us-east-1 is approximately ~$0.34/hr. Fixed the figure.

8. **"When to Use Each" and Summary referenced MongoDB 4.0:** Updated to remove the specific "4.0" version references since DocumentDB now supports multiple versions.

9. **Aggregation example comment updated:** Changed "may fail" to "fails" with specific reasons (correlated $lookup and $facet are unsupported in DocumentDB).

## Review Notes
- The mongodump example for DocumentDB migration includes `ssl=true` in the URI but does not reference the Amazon RDS CA certificate file, which is typically required for TLS connections to DocumentDB. A production command would need `--tlsCAFile` or the `tlsCAFile` URI parameter pointing to the RDS combined CA bundle. This is acceptable for a conceptual example but readers should be aware.
- Pricing figures are approximate and will drift over time. The post correctly labels them as approximate.
- The performance comparison section makes qualitative claims without benchmarks. While the general characterizations are reasonable (Aurora-style storage layer, WiredTiger advantages), readers should run their own benchmarks for their specific workloads.
- DocumentDB 8.0 (released November 2025) added several features that narrow the gap with MongoDB, including $bucket support and improved text indexing (V2). The gap list may need future updates as DocumentDB continues to add features.
