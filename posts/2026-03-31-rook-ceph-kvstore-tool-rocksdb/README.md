# How to Use ceph-kvstore-tool for RocksDB Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RocksDB, ceph-kvstore-tool, Debugging, OSD

Description: Use ceph-kvstore-tool to inspect and manipulate the RocksDB key-value stores used by Ceph OSDs and monitors for low-level debugging and recovery.

---

## What is ceph-kvstore-tool

Ceph uses RocksDB as its internal key-value store for both BlueStore OSDs and monitor stores. `ceph-kvstore-tool` provides direct access to these stores for inspection, export, and targeted manipulation when normal Ceph commands cannot reach the data.

## Access the OSD RocksDB Store

For BlueStore OSDs, the RocksDB metadata is embedded within the OSD device. You must first stop the OSD:

```bash
# Stop the OSD
kubectl -n rook-ceph scale deployment rook-ceph-osd-0 --replicas=0

# The BlueStore DB can be at a separate device or embedded
# Check the OSD's kv_backend
ceph-kvstore-tool bluestore-kv \
  /var/lib/ceph/osd/ceph-0 \
  list
```

## List Keys in the Monitor Store

```bash
# For monitor RocksDB stores (leveldb or rocksdb)
ceph-kvstore-tool rocksdb \
  /var/lib/ceph/mon/ceph-a/store.db \
  list

# Filter keys by prefix
ceph-kvstore-tool rocksdb \
  /var/lib/ceph/mon/ceph-a/store.db \
  list monmap
```

## Get a Specific Key

```bash
# Retrieve a specific key value
ceph-kvstore-tool rocksdb \
  /var/lib/ceph/mon/ceph-a/store.db \
  get monmap 1 \
  out /tmp/monmap-version1.bin

# Decode the monmap
monmaptool --print /tmp/monmap-version1.bin
```

## Compact the RocksDB Store

Large RocksDB stores can slow monitor and OSD startup. Force compaction:

```bash
ceph-kvstore-tool rocksdb \
  /var/lib/ceph/mon/ceph-a/store.db \
  compact

# Check size before and after
du -sh /var/lib/ceph/mon/ceph-a/store.db
```

## Dump All Keys to a File

```bash
# Export all keys for analysis
ceph-kvstore-tool rocksdb \
  /var/lib/ceph/mon/ceph-a/store.db \
  dump > /tmp/kvstore-dump.txt

# Search for specific entries
grep "osdmap" /tmp/kvstore-dump.txt | head -20
```

## Repair a Corrupt RocksDB Store

```bash
# Attempt RocksDB repair (potentially destructive - use as last resort)
ceph-kvstore-tool rocksdb \
  /var/lib/ceph/mon/ceph-a/store.db \
  destructive-repair

# Verify repair worked by listing keys
ceph-kvstore-tool rocksdb \
  /var/lib/ceph/mon/ceph-a/store.db \
  list | wc -l
```

## Delete Specific Keys (Advanced)

Use only as a last resort under Ceph engineering guidance:

```bash
# Delete a specific problematic key
ceph-kvstore-tool rocksdb \
  /var/lib/ceph/mon/ceph-a/store.db \
  rm <prefix> <key>

# Always back up the store first
cp -r /var/lib/ceph/mon/ceph-a/store.db \
      /var/lib/ceph/mon/ceph-a/store.db.backup
```

## Summary

`ceph-kvstore-tool` provides direct access to the RocksDB stores that underpin Ceph monitors and BlueStore OSDs. It is most useful for compacting growing stores, extracting specific maps for analysis, and repairing corrupt database files that prevent component startup. Always back up the store directory before making modifications.
