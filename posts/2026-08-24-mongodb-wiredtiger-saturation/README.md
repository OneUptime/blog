# Detect MongoDB WiredTiger Saturation Signals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Admission Queues, Cache Eviction, Database Alerts

Description: Detect WiredTiger pressure by combining version-correct execution queues with cache occupancy, dirty data, eviction work, I/O rates, and application latency.

---

WiredTiger saturation is not one percentage. A full-looking cache may be healthy, and a low admission-ticket count may be normal under MongoDB's dynamic ticket algorithm. The actionable condition is sustained work waiting for admission or eviction while latency and storage pressure rise.

## Use the metric path for the server version

MongoDB 8.0 introduced execution-admission metrics at the following path. Run these checks against each `mongod`; `mongos` does not expose a WiredTiger cache or the storage execution ticket pool:

```javascript
const s = db.serverStatus()
s.queues.execution
```

The document has separate `read` and `write` pools. Each reports `out`, `available`, and `totalTickets`, plus queue accounting for normal-priority and exempt operations. Export at least:

```text
queues.execution.read.normalPriority.queueLength
queues.execution.read.normalPriority.addedToQueue
queues.execution.read.normalPriority.removedFromQueue
queues.execution.read.normalPriority.totalTimeQueuedMicros
queues.execution.read.available
queues.execution.read.totalTickets

queues.execution.write.normalPriority.queueLength
queues.execution.write.normalPriority.addedToQueue
queues.execution.write.normalPriority.removedFromQueue
queues.execution.write.normalPriority.totalTimeQueuedMicros
queues.execution.write.available
queues.execution.write.totalTickets
```

These field names are literal object paths; use bracket notation in code for WiredTiger fields that contain spaces.

MongoDB 8.3 adds a `lowPriority` pool and the `usesPrioritization` field. When prioritization is enabled, collect the same queue counters plus `available` and `totalTickets` from each read and write `lowPriority` object; otherwise a low-priority backlog can be missed.

Older dashboards commonly read ticket data from `wiredTiger.concurrentTransactions`. Do not silently map that legacy location to the 8.0 queue schema: names and semantics differ. Branch collectors by the exact `serverStatus` schema and server release, and retain a version label on recording rules.

## Do not alert on low `available` alone

Beginning with MongoDB 7.0, the storage engine dynamically adjusts concurrent read and write ticket capacity, up to 128 tickets for each pool. Because the algorithm intentionally changes the pool, low `available` by itself does not demonstrate overload.

The stronger signals are:

- a nonzero `queueLength` in a collected priority pool that persists;
- positive deltas of `addedToQueue` and `totalTimeQueuedMicros`;
- rising average queue time for waits that left the queue;
- application latency rising over the same interval.

Calculate average queue time for waits removed during the interval only from matched counter deltas:

```text
avg_removed_queue_seconds =
  delta(totalTimeQueuedMicros) / delta(removedFromQueue) / 1e6
```

Return no value when `delta(removedFromQueue)` is zero. The queued-time counter and `removedFromQueue` advance when a queued wait ends, including a canceled wait, so this is an interval average for queue departures rather than arrivals. Reject intervals after restart or counter decrease. A queue can drain between scrapes, so cumulative queue arrivals, removals, and time are necessary alongside the instantaneous length.

On MongoDB 8.0, setting `storageEngineConcurrentReadTransactions` or `storageEngineConcurrentWriteTransactions` at startup selects fixed concurrency instead of dynamic adjustment; a runtime change is rejected while dynamic adjustment is active. MongoDB recommends working with Support before disabling dynamic ticket adjustment. Treat a manual ticket setting as a controlled experiment with a rollback plan, not a routine response to low availability.

## Add the WiredTiger cache picture

From `serverStatus().wiredTiger.cache`, collect these exact current fields:

```text
maximum bytes configured
bytes currently in the cache
tracked dirty bytes in the cache
pages read into cache
pages written from cache
bytes read into cache
bytes written from cache
application threads page read from disk to cache time (usecs)
application threads page write from cache to disk time (usecs)
application threads page read from disk to cache count
application threads page write from cache to disk count
application thread time evicting (usecs)
eviction currently operating in aggressive mode
pages queued for urgent eviction
```

WiredTiger exposes many more eviction fields and some names change across releases. Discover them from a node running the exact build, then pin the collector schema.

Useful interval calculations include:

```text
cache_used_fraction       = bytes_currently_in_cache / maximum_bytes_configured
dirty_fraction            = tracked_dirty_bytes / maximum_bytes_configured
page_read_rate            = delta(pages_read_into_cache) / seconds
page_write_rate           = delta(pages_written_from_cache) / seconds
urgent_eviction_rate      = delta(pages_queued_for_urgent_eviction) / seconds
app_read_io_time_share    = delta(app_read_time_usec) / interval_usec
app_eviction_time_share   = delta(app_eviction_time_usec) / interval_usec
```

The two `*_time_share` values normalize aggregated application-thread time by wall time and can exceed 1 when multiple threads perform the work concurrently. They are not wall-clock or device utilization.

`pages queued for urgent eviction` is a cumulative event counter, so evaluate its delta or rate rather than its absolute value. In MongoDB 8.0's bundled WiredTiger, `eviction currently operating in aggressive mode` is a current 0–100 score rather than a Boolean, and aggressive mode begins at 10. Verify that interpretation against the exact bundled WiredTiger build.

## Recognize an eviction bottleneck

Evidence for meaningful saturation strengthens when several signals move together:

- execution queue length and queue-time rate stay elevated;
- application threads spend increasing time evicting pages or performing page-read/page-write I/O;
- dirty bytes remain high instead of being checkpointed and evicted;
- the urgent-eviction rate stays elevated or the aggressive-mode score stays at or above the build's threshold;
- block-device latency, queue depth, and write throughput deteriorate;
- operation latency rises and throughput stops scaling.

A high cache-used fraction without those symptoms is expected: a cache exists to be used. A burst of page reads may be a cold cache or an intentional scan. Dirty-byte growth during a bulk write can be healthy if checkpoints and storage drain it promptly.

MongoDB also relies on the filesystem cache. Do not size WiredTiger by assuming all remaining RAM is free or by counting every WiredTiger cache miss as physical disk I/O. Correlate with resident memory, page faults, filesystem and block-device metrics, checkpoints, and workload events.

## Build a version-aware alert

One practical alert requires, for several minutes:

1. any collected read or write `queueLength > 0`, or a significant queue-time rate;
2. increasing `addedToQueue` and application latency;
3. at least one pressure confirmation such as increasing application-thread eviction or page-I/O time, a persistently elevated dirty fraction, a sustained urgent-eviction rate or aggressive-mode score, or elevated storage latency.

Keep reads and writes separate; a saturated write path can coexist with available read tickets. Annotate checkpoints, backups, initial sync, index builds, compaction, and bulk loads.

Collect `serverStatus` with an account limited to the monitoring privileges needed. Avoid very high-frequency collection of the entire large response. Use version-supported field exclusions to reduce the response, transform only the relevant fields before export, and measure monitoring overhead.

## Official Documentation

- [MongoDB `serverStatus` queue and WiredTiger fields](https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- [MongoDB WiredTiger storage engine](https://www.mongodb.com/docs/manual/core/wiredtiger/)
- [MongoDB self-managed diagnostics FAQ](https://www.mongodb.com/docs/manual/faq/diagnostics/)
- [MongoDB concurrent read transaction parameter](https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.storageEngineConcurrentReadTransactions)
- [MongoDB concurrent write transaction parameter](https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.storageEngineConcurrentWriteTransactions)

## Conclusion

On MongoDB 8.0 and later, read execution admission from `serverStatus().queues.execution` and include every active priority pool; on older releases, use the documented version-specific source. Alert on persistent queued reads or writes and growing queue time-not low ticket availability alone-and confirm the condition with dirty-cache, eviction, storage, and application-latency evidence.
