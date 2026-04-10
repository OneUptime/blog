# How to Configure Journal Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Journal, Filestore, Performance

Description: Learn how to configure Ceph journal settings for FileStore OSDs, including journal size, placement, and write-ahead log tuning.

---

## What is the Ceph Journal

In FileStore-based Ceph deployments, each OSD uses a write-ahead journal to ensure data consistency. All incoming writes go to the journal first, then are replayed asynchronously to the backing filesystem. This ensures that a crash mid-write does not leave data in an inconsistent state.

The journal is critical to FileStore performance. When the journal is on a slow device (the same spinning disk as data), it creates a bottleneck. Placing the journal on a dedicated SSD dramatically improves throughput.

Note: BlueStore (the current default backend) uses its own internal WAL and does not use the FileStore journal configuration described here.

## Journal Size

The journal size determines how much write data can be buffered before the journal must be committed to the OSD data store. The recommended minimum is 1 GB, but 10 GB is typical for production:

```ini
[osd]
osd_journal_size = 10240
```

Size is in megabytes. For workloads with large sequential writes, increase this value.

## Journal Path

Specify the journal path per-OSD to place it on a dedicated device:

```ini
[osd.0]
osd_journal = /dev/sdb1

[osd.1]
osd_journal = /dev/sdb2

[osd.2]
osd_journal = /dev/sdb3
```

Each OSD should have its own journal partition. You can co-locate multiple journals on a single SSD by using separate partitions.

## Write-Ahead Journal Tuning

Control how the journal flushes to disk:

```ini
[osd]
# Ensure journal writes are synchronous (required for safety)
filestore_journal_writeahead = true

# Maximum time between journal syncs (seconds)
filestore_max_sync_interval = 5

# Minimum time between journal syncs
filestore_min_sync_interval = 0.01
```

## Checking Journal Latency

Monitor journal commit latency to detect slow journal devices:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

Look for the `commit_latency_ms` column. Values above 10 ms indicate a slow journal device.

## Applying Journal Settings via Ceph Config

For clusters using the monitor config database:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_journal_size 10240

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd filestore_max_sync_interval 5
```

## Journal vs BlueStore WAL

In BlueStore clusters, the equivalent of the journal is the RocksDB WAL. It is managed internally and configured via `bluestore_rocksdb_options`. You do not set `osd_journal_size` for BlueStore OSDs.

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd bluestore_rocksdb_options
```

## Summary

The Ceph journal provides write-ahead logging for FileStore OSDs. Always place the journal on a dedicated SSD, size it to at least 10 GB, and ensure `filestore_journal_writeahead` is enabled. Monitor commit latency via `ceph osd perf`. For BlueStore clusters, journal configuration is handled internally through RocksDB.
