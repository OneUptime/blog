# How to Configure RDB Snapshots for Memorystore Redis Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Memorystore, Redis, Persistence, RDB Snapshots

Description: Learn how to enable and configure RDB snapshot persistence for Google Cloud Memorystore for Redis to protect your data against instance failures.

---

Redis is often used as a pure cache where data loss is acceptable. But in many real-world scenarios, you store session data, rate-limiting counters, or feature flags in Redis that you really do not want to lose. Google Cloud Memorystore for Redis supports RDB snapshot persistence, which periodically saves a point-in-time snapshot of your data to disk. If the instance crashes or restarts, it can recover from the most recent snapshot instead of starting empty.

In this post, I will walk through how to enable RDB snapshots, configure the snapshot schedule, and understand the trade-offs involved.

## How RDB Persistence Works in Memorystore

When you enable RDB persistence on a Memorystore instance, Redis periodically forks the process and writes the entire dataset to an RDB file. This file is stored on the instance's persistent disk. If the Redis process restarts, it reads the RDB file on startup and repopulates memory.

The key thing to understand is that RDB snapshots are periodic. If Redis crashes between snapshots, you lose any data written since the last snapshot. This is different from AOF (Append Only File) persistence, which logs every write operation. Memorystore does not currently support AOF, so RDB is what you have to work with.

## Prerequisites

RDB persistence is only available on Standard tier Memorystore instances running Redis 5.0 or later. Basic tier instances do not support persistence because they lack the replica that makes recovery reliable.

You will also need:

- The gcloud CLI installed and configured
- A Memorystore instance or the intent to create one
- The `redis.admin` IAM role on your project

## Creating an Instance with RDB Persistence Enabled

If you are creating a new instance, you can enable persistence right from the start. The following command creates a Standard tier instance with RDB snapshots configured to run every 12 hours:

```bash
# Create a Memorystore instance with RDB persistence enabled
# Snapshots will be taken every 12 hours
gcloud redis instances create my-persistent-redis \
  --size=5 \
  --region=us-central1 \
  --tier=STANDARD \
  --redis-version=redis_7_0 \
  --persistence-mode=RDB \
  --rdb-snapshot-period=12h
```

The `--rdb-snapshot-period` flag accepts the following values:
- `1h` - Snapshot every hour
- `6h` - Snapshot every 6 hours
- `12h` - Snapshot every 12 hours
- `24h` - Snapshot every 24 hours

## Enabling RDB Persistence on an Existing Instance

If you already have a Memorystore instance running without persistence, you can enable it with an update command:

```bash
# Enable RDB persistence on an existing instance
gcloud redis instances update my-redis-instance \
  --region=us-central1 \
  --persistence-mode=RDB \
  --rdb-snapshot-period=6h
```

This command does not cause downtime. The instance will start taking snapshots at the configured interval without interrupting client connections.

## Verifying Persistence Configuration

After enabling persistence, verify that the configuration took effect:

```bash
# Check the persistence configuration of your instance
gcloud redis instances describe my-redis-instance \
  --region=us-central1 \
  --format="yaml(persistenceConfig)"
```

The output will show something like:

```yaml
persistenceConfig:
  persistenceMode: RDB
  rdbSnapshotPeriod: SIX_HOURS
  rdbSnapshotStartTime: "2026-02-17T08:00:00Z"
  rdbNextSnapshotTime: "2026-02-17T14:00:00Z"
```

You can see when the next snapshot is scheduled and when the last one completed. This is useful for confirming that snapshots are actually happening.

## Choosing the Right Snapshot Frequency

The snapshot frequency is a balance between data safety and performance impact. Here is how to think about it:

**Every 1 hour** - Best for data you really cannot afford to lose. The trade-off is that each snapshot triggers a fork of the Redis process, which temporarily doubles memory usage. On large instances, this can cause latency spikes.

**Every 6 hours** - A good middle ground for most production workloads. You lose at most 6 hours of data, which is acceptable for session stores, caches with warm-up strategies, and similar use cases.

**Every 12 hours** - Suitable for data that is relatively easy to reconstruct. If you can re-warm your cache from a database within a few hours, this frequency keeps performance impact low.

**Every 24 hours** - Best for instances where persistence is a nice-to-have rather than a requirement. The performance impact is minimal.

## Memory Overhead of RDB Snapshots

When Redis creates an RDB snapshot, it uses the operating system's copy-on-write mechanism. The Redis process forks, and the child process writes the dataset to disk. During this time, if the parent process modifies keys, the OS needs to copy those memory pages.

In the worst case, memory usage can temporarily double during a snapshot. Memorystore accounts for this by reserving some overhead, but you should be aware of it. If your instance is using close to its maximum memory capacity, you might see evictions during snapshot creation.

A good rule of thumb is to keep your memory usage below 80% of the instance capacity when using RDB persistence. This gives Redis enough room to handle the copy-on-write overhead.

## Configuring Snapshot Start Time

You can control when the first snapshot window begins. This is useful for scheduling snapshots during low-traffic periods:

```bash
# Set a specific start time for the RDB snapshot window
gcloud redis instances update my-redis-instance \
  --region=us-central1 \
  --rdb-snapshot-start-time="2026-02-17T04:00:00Z"
```

Subsequent snapshots will be taken at the configured interval from this start time. For example, if you set the start time to 4 AM UTC and the interval to 6 hours, snapshots happen at 4 AM, 10 AM, 4 PM, and 10 PM UTC.

## Monitoring Snapshot Health

You should monitor your snapshot status to make sure they are completing successfully. Cloud Monitoring exposes metrics for Memorystore instances:

```bash
# List recent Memorystore metrics related to persistence
gcloud monitoring metrics list \
  --filter="metric.type = starts_with(\"redis.googleapis.com/persistence\")"
```

Key metrics to watch:

- `redis.googleapis.com/persistence/rdb/bgsave_in_progress` - Whether a snapshot is currently running
- `redis.googleapis.com/stats/memory/usage_ratio` - Memory usage as a fraction of capacity

Set up an alert if memory usage exceeds 80% while persistence is enabled. This gives you time to scale up before snapshots start causing problems.

## Disabling Persistence

If you decide you no longer need persistence, you can disable it:

```bash
# Disable RDB persistence on an instance
gcloud redis instances update my-redis-instance \
  --region=us-central1 \
  --persistence-mode=DISABLED
```

This removes the persistence configuration and stops future snapshots. Existing snapshot data on disk is cleaned up automatically.

## What Happens During a Failover

With Standard tier and RDB persistence enabled, here is what happens during different failure scenarios:

**Node restart** - Redis restarts and loads the most recent RDB snapshot. Any data written since the last snapshot is lost.

**Automatic failover** - The replica is promoted to primary. The replica has a near-real-time copy of the data (through Redis replication, not RDB). Data loss is minimal, typically less than a second of writes.

**Zone outage** - Similar to automatic failover. The replica in the other zone takes over.

The combination of Standard tier replication and RDB persistence gives you two layers of protection. Replication handles transient failures with minimal data loss, and RDB snapshots handle cases where both the primary and replica need to be reconstructed.

## Best Practices

1. Always use Standard tier when enabling persistence. Basic tier instances lose all data on restart regardless of persistence settings.

2. Keep memory utilization below 80% to leave room for the copy-on-write overhead during snapshots.

3. Schedule snapshots during low-traffic windows when possible.

4. Monitor snapshot completion and memory usage with Cloud Monitoring alerts.

5. Test recovery by intentionally triggering a failover in a staging environment and verifying that data survives.

RDB snapshots are a simple but effective way to add durability to your Memorystore Redis instances. They will not give you zero-data-loss guarantees like a traditional database, but they dramatically reduce the blast radius of an instance failure. For most caching and session-store workloads, that is more than enough.
