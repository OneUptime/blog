# How to Sample MongoDB Slow Operations with `slowms`, `sampleRate`, and Filters Without Overloading Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Database Profiler, Slow Queries, Sampling, Production Monitoring

Description: Configure MongoDB slow-operation logging and profiling with explicit sampling semantics, bounded storage, and version-aware filters that avoid accidental full capture.

---

MongoDB can surface slow operations in two places: the diagnostic log and, on `mongod`, the per-database `system.profile` collection. The controls overlap, but they are not interchangeable.

A safe production rollout starts with diagnostic logging, a representative threshold, and a small sample. Enable the database profiler only for a bounded investigation after accounting for its overhead and the sensitive data it records.

## Choose the destination first

On a `mongod`, this command enables profiling at level 1 for the current database and also changes slow-operation logging behavior:

```javascript
db.setProfilingLevel(1, {
  slowms: 200,
  sampleRate: 0.10
})
```

At level 1, operations exceeding `slowms` are candidates and `sampleRate` selects a random fraction between 0 and 1. At level 2, the profiler captures all operations; do not expect `slowms`, `sampleRate`, or a filter to bound profiler volume. It is rarely an appropriate production setting.

To leave the profiler off while configuring the diagnostic log:

```javascript
db.setProfilingLevel(0, {
  slowms: 200,
  sampleRate: 0.10
})
```

With level 0, `slowms` and `sampleRate` affect the diagnostic log only. A `mongos` has no profiler collection, so its profiling level must remain 0; the same options configure only its diagnostic log.

Inspect the current database's effective values with:

```javascript
db.getProfilingStatus()
```

Profiling level is database-specific. The slow-operation threshold also affects diagnostic logging across the `mongod`, so a change made while connected to one database can have broader logging consequences.

## Understand what “slow” measures

MongoDB qualifies slow operations using `workingMillis`: time it spends working on the operation. Time waiting for locks or flow control does not cause an operation to cross the slow threshold. End-to-end client latency can therefore be high even when the operation is not sampled as slow.

Correlate profiler or log evidence with:

- client and server command latency;
- lock acquisition and flow-control metrics;
- admission queues and WiredTiger cache pressure;
- application retries and connection-pool waits.

Starting in MongoDB 8.0, `workingMillis` can also be used in a profiler filter. Older releases expose different filterable fields, so do not deploy an 8.0 filter fleet-wide without a version gate.

## Treat filters as an alternative policy

A filter does not combine with `slowms` and `sampleRate`. When a profiling filter is set, those two settings no longer affect either the profiler or slow-query diagnostic log; only matching operations are selected.

For example, on MongoDB 8.0 or later:

```javascript
db.setProfilingLevel(1, {
  filter: {
    $and: [
      { workingMillis: { $gte: 500 } },
      { ns: /^orders\./ }
    ]
  }
})
```

Do not add `sampleRate: 0.1` and expect this result set to be sampled. The filter makes the sampling option ineffective. If the filter matches too broadly, the profiler and diagnostic log can receive every matching operation.

Test a filter against representative profiler-shaped documents, estimate its match rate, and add a separate collector-side sampling or rate limit if probabilistic reduction is still required. Remember that level 2 ignores the filter.

## Bound storage and exposure

The profiler writes to `system.profile`, a capped collection. Its default size is small, so busy databases can overwrite entries rapidly; increasing it retains more sensitive data and consumes more disk. Inspect it from the profiled database:

```javascript
db.system.profile.stats()

db.system.profile.find(
  {},
  {
    ts: 1,
    ns: 1,
    op: 1,
    millis: 1,
    workingMillis: 1,
    planCacheShapeHash: 1,
    planCacheKey: 1,
    docsExamined: 1,
    nreturned: 1
  }
).sort({ ts: -1 }).limit(20)
```

Field availability varies by release and operation. In MongoDB 8.0, `planCacheShapeHash` duplicates the earlier `queryHash` concept; version collection queries and dashboards rather than assuming both exist everywhere.

Profiler documents and diagnostic logs can contain query text and unencrypted application data. Restrict read access, secure logs in transit and at rest, redact before a shared backend, and set retention intentionally. Profiling itself can degrade performance.

## Make runtime changes reproducible

Changes made with `db.setProfilingLevel()` are not persistent. On restart, the level returns to the startup default or to `operationProfiling.mode`/`--profile`, and threshold or sampling values come from their persistent configuration.

For a temporary investigation:

1. record the values returned by `db.getProfilingStatus()`;
2. define a start time, stop time, owner, and maximum sample/log volume;
3. apply the smallest useful sample rate or tested filter;
4. watch log throughput, profiler turnover, disk, CPU, and latency;
5. restore the previous settings and confirm them.

For a permanent policy, express `operationProfiling.mode`, `slowOpThresholdMs`, and `slowOpSampleRate` in the deployment configuration. Keep `logLevel` in mind: at higher diagnostic log levels, normal operation logging behavior differs from the default slow-operation sampling policy.

## Official Documentation

- [MongoDB `db.setProfilingLevel()`](https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/)
- [MongoDB Database Profiler management](https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/)
- [MongoDB profiler output](https://www.mongodb.com/docs/manual/reference/database-profiler/)
- [MongoDB self-managed configuration options](https://www.mongodb.com/docs/manual/reference/configuration-options/#operation-profiling-options)
- [MongoDB diagnostic log messages](https://www.mongodb.com/docs/manual/reference/log-messages/)

## Conclusion

Use `slowms` and `sampleRate` together only when no profiler filter is active, keep `mongos` at profiling level 0, and remember that slow qualification uses working time rather than every source of client latency. Bound the investigation by time, volume, storage, and access, then restore or persist the intended configuration explicitly.
