# Validation Summary: How to Detect MongoDB WiredTiger Saturation with Ticket Queues, Cache Eviction, and Dirty Bytes

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- MongoDB 7.0, 8.0, and 8.3
- MongoDB `serverStatus` monitoring
- WiredTiger execution admission and transaction tickets
- WiredTiger cache occupancy, dirty data, and eviction
- Database, storage, and application-latency alerting

## Sources Consulted

- [MongoDB 8.0 `serverStatus` reference](https://www.mongodb.com/docs/v8.0/reference/command/serverStatus/)
- [Current MongoDB `serverStatus` reference, including MongoDB 8.3 queue fields](https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- [MongoDB 7.0 `serverStatus` reference for `wiredTiger.concurrentTransactions`](https://www.mongodb.com/docs/v7.0/reference/command/serverStatus/)
- [MongoDB 8.0 compatibility notes: `serverStatus` output change](https://www.mongodb.com/docs/v8.0/release-notes/8.0-compatibility/#serverstatus-output-change)
- [MongoDB 8.3 release notes: `serverStatus` output](https://www.mongodb.com/docs/manual/release-notes/8.3/#serverstatus-output)
- [MongoDB WiredTiger storage engine: transaction concurrency and memory use](https://www.mongodb.com/docs/manual/core/wiredtiger/)
- [MongoDB self-managed diagnostics FAQ](https://www.mongodb.com/docs/manual/faq/diagnostics/)
- [MongoDB concurrent read transaction parameter](https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.storageEngineConcurrentReadTransactions)
- [MongoDB concurrent write transaction parameter](https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.storageEngineConcurrentWriteTransactions)
- [MongoDB 8.0 queue counter implementation](https://github.com/mongodb/mongo/blob/r8.0.0/src/mongo/util/concurrency/ticketholder.cpp#L144-L177)
- [MongoDB 8.0 execution-control initialization](https://github.com/mongodb/mongo/blob/r8.0.0/src/mongo/db/admission/execution_control_init.cpp#L47-L67)
- [MongoDB 8.0 runtime ticket-resize checks](https://github.com/mongodb/mongo/blob/r8.0.0/src/mongo/db/admission/ticketholder_manager.cpp#L58-L119)
- [MongoDB 8.0 bundled WiredTiger statistic definitions](https://github.com/mongodb/mongo/blob/r8.0.0/src/third_party/wiredtiger/dist/stat_data.py)
- [MongoDB 8.0 bundled WiredTiger eviction-score bounds](https://github.com/mongodb/mongo/blob/r8.0.0/src/third_party/wiredtiger/src/include/cache.h#L177-L186)
- [MongoDB 8.0 bundled WiredTiger aggressive-mode predicate](https://github.com/mongodb/mongo/blob/r8.0.0/src/third_party/wiredtiger/src/include/cache_inline.h#L10-L19)

## Issues Found
No technical issues found.

## Review Notes

- The `mongosh` example is syntactically valid, and all listed MongoDB 8.0 queue paths and WiredTiger statistic names match the documented or source-defined schema.
- MongoDB 8.3 adds per-priority capacity fields under both `normalPriority` and `lowPriority`. When `usesPrioritization` is true, the top-level read/write `out`, `available`, and `totalTickets` values aggregate the priority pools. The post's alert remains correct because it separates the priority-specific queue counters and explicitly includes the active low-priority pool.
- The average queue-time formula correctly divides matched deltas of `totalTimeQueuedMicros` and `removedFromQueue`. MongoDB updates both counters when a queued wait departs, including the cancellation path.
- In MongoDB 8.0's bundled WiredTiger, `eviction currently operating in aggressive mode` exports the current eviction-aggressiveness score. Its range is 0 through 100, and the aggressive-mode predicate uses a threshold of 10.
- WiredTiger rate calculations should discard intervals spanning process restarts or counter resets, as the post already requires for admission-queue counters.
