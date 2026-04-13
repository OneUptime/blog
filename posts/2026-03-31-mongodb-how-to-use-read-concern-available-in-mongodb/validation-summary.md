# Validation Summary: How to Use Read Concern 'available' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (read concerns, sharded clusters, chunk migrations)
- MongoDB Node.js Driver (v4+/v5+/v6+)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual — Read Concern "available": https://www.mongodb.com/docs/manual/reference/read-concern-available/
- MongoDB Manual — Read Concern "local": https://www.mongodb.com/docs/manual/reference/read-concern-local/
- MongoDB Manual — Read Concern reference: https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB Manual — Distributed Queries: https://www.mongodb.com/docs/manual/core/distributed-queries/
- MongoDB Manual — Sharded Cluster Balancer: https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
- MongoDB Node.js Driver API — FindCursor (v6.2): https://mongodb.github.io/node-mongodb-native/6.2/classes/FindCursor.html
- MongoDB Node.js Driver API — AbstractCursor (v6.2): https://mongodb.github.io/node-mongodb-native/6.2/classes/AbstractCursor.html

## Issues Found
- **Incorrect claim about `local` blocking reads during chunk migrations (line 68):** The post stated that "`local` may briefly block reads on moving chunks to avoid orphan exposure." This is inaccurate. The brief pause that occurs during the chunk migration commit phase is a general balancer behavior that affects ALL read concerns equally — it is not specific to `local`. The actual mechanism by which `local` avoids orphaned documents is metadata filtering: each shard replica set member maintains chunk metadata, and `local` uses this metadata to filter out orphaned documents. Fixed the description to accurately reflect the metadata-based filtering mechanism.

## Review Notes
- The Node.js code using `withReadConcern(new ReadConcern("available"))` on a cursor is correct — `AbstractCursor` provides this method and `FindCursor` inherits it.
- The mongosh `.readConcern("available")` cursor chain syntax is correct.
- The `countDocuments` example with `readConcern` in options is correct — `countDocuments` internally uses an aggregation pipeline and inherits `readConcern` from `AggregateOptions`.
- The post's characterization of `local` performing "ownership checks" (line 20) is an informal but acceptable simplification. The MongoDB docs describe the mechanism as metadata filtering, but the docs also explicitly recommend `local` "to avoid the risk of returning orphaned documents," so the post's framing is substantively aligned with official guidance.
