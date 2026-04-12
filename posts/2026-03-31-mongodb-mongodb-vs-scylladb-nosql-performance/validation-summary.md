# Validation Summary: MongoDB vs ScyllaDB: NoSQL Performance Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (document store, WiredTiger storage engine, multi-document ACID transactions)
- ScyllaDB (wide-column store, CQL-compatible, shard-per-core architecture)
- Apache Cassandra (referenced as ScyllaDB's origin/compatibility target)
- MongoDB Atlas (managed service)
- ScyllaDB Cloud (managed service)

## Sources Consulted
- MongoDB official documentation: insertOne, find, and transaction APIs — https://www.mongodb.com/docs/manual/
- MongoDB Node.js driver documentation: session and transaction handling — https://www.mongodb.com/docs/drivers/node/current/
- ScyllaDB CQL documentation: CREATE TABLE, PRIMARY KEY, CLUSTERING ORDER, lightweight transactions — https://opensource.docs.scylladb.com/stable/cql/
- ScyllaDB architecture documentation: shard-per-core design — https://opensource.docs.scylladb.com/stable/architecture/
- MongoDB release notes for version 4.0 (multi-document transactions) — https://www.mongodb.com/docs/manual/release-notes/4.0/

## Issues Found
No technical issues found.

## Review Notes
- The MongoDB transaction example uses the manual `startTransaction`/`commitTransaction`/`abortTransaction` pattern. While correct, the modern recommended approach is `session.withTransaction()` which handles retries automatically. The manual approach is still valid and not deprecated.
- The MongoDB transaction example omits `session.endSession()` cleanup. This is acceptable for a simplified example but would be important in production code.
- Benchmark numbers (ScyllaDB 1-3M ops/sec, MongoDB 100K-500K ops/sec per node) are clearly labeled as approximate. Actual performance varies significantly based on hardware, document size, indexing, and workload patterns.
- ScyllaDB has been transitioning from Paxos to Raft for some internal consensus operations (schema changes, topology). However, the post's claim that LWTs use Paxos remains accurate as of current ScyllaDB versions.
