# How to Understand Write-Ahead Logging for Data Safety in BlueStore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, Write-Ahead Log, Data Safety

Description: Learn how BlueStore's write-ahead log and RocksDB metadata store protect against data loss during crashes and how to configure WAL placement for performance.

---

BlueStore replaced FileStore as Ceph's default object store because it provides better performance and stronger data safety guarantees. At the core of BlueStore's safety model is the write-ahead log (WAL) combined with RocksDB for metadata management.

## How BlueStore WAL Works

When BlueStore writes data, it follows this sequence:

1. Write data to the WAL (journal device or main device)
2. Acknowledge the write to the client
3. Commit data to its final location on the main block device
4. Remove the WAL entry after successful commit

If the OSD crashes between steps 2 and 3, the WAL replays on restart to complete the committed write. This guarantees that no acknowledged write is ever lost.

## WAL vs RocksDB vs Main Device

BlueStore uses three logical storage areas:

```text
+------------------+------------------+------------------+
| Main Block Dev   | WAL Device       | RocksDB (DB)     |
| Object data      | RocksDB WAL      | Metadata index   |
+------------------+------------------+------------------+
```

Each can reside on the same device or be split across devices for performance.

## Configuring WAL Placement

By default all three share the same disk. To place WAL on a fast NVMe device:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    nodes:
    - name: worker-1
      devices:
      - name: sdb
        config:
          osdsPerDevice: "1"
          metadataDevice: nvme0n1
```

At the ceph level, this maps to:

```bash
ceph-volume lvm create --bluestore --data /dev/sdb \
  --block.wal /dev/nvme0n1 \
  --block.db /dev/nvme0n1
```

## WAL Device Sizing

The WAL does not need to be large. A few GB per OSD is typically sufficient because BlueStore flushes the WAL quickly for large sequential writes:

```bash
# Recommended: 512 MB to 4 GB per OSD for WAL
ceph config set osd bluestore_block_wal_size 2147483648
```

## Checking WAL Activity

Monitor WAL metrics:

```bash
ceph tell osd.0 perf dump | python3 -m json.tool | grep -i wal
```

Key metrics:
- `bluestore_deferred_write_ops` - deferred write operations
- `bluestore_deferred_write_bytes` - bytes written through deferred writes

## Write Safety Configuration

For maximum durability, ensure BlueStore flushes to stable storage:

```bash
# Disable deferred writes (higher latency, maximum safety)
ceph config set osd bluestore_prefer_deferred_size 0

# Sync metadata on every commit
ceph config set osd bluestore_sync_submit_transaction true
```

For performance-optimized setups with fast WAL devices, deferred writes can be left enabled.

## RocksDB Sync Settings

```bash
# Disable periodic background sync in RocksDB (relies on BlueStore's own sync)
ceph config set osd bluestore_rocksdb_options "wal_bytes_per_sync=0,bytes_per_sync=0"
```

## Summary

BlueStore's write-ahead log ensures that every acknowledged write survives an OSD crash by storing writes in the WAL before committing them to the main device. Placing the WAL on a fast NVMe device significantly improves write latency. Understanding and configuring WAL placement, sizing, and sync settings is fundamental to balancing performance and data safety in your Ceph deployment.
