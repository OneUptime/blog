# How to Tune BlueStore WAL and DB Performance in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, Performance, Storage, RocksDB

Description: Optimize Ceph BlueStore WAL and RocksDB metadata device placement and sizing to significantly improve OSD write performance and reduce metadata I/O latency.

---

## BlueStore Architecture: WAL and DB

BlueStore uses two metadata storage areas within each OSD:

- **WAL (Write-Ahead Log)**: Temporary log of pending writes. Very write-intensive, benefits most from fast storage. Typical size: 512 MiB to 2 GiB per OSD.
- **DB (RocksDB)**: Persistent key-value metadata store. Stores object maps, onode metadata. Larger than WAL. Typical size: 4-32 GiB per OSD.

Both can be co-located on the main data device (default) or placed on separate faster devices for significant performance gains.

## Checking Current WAL/DB Configuration

```bash
# View BlueStore device layout for an OSD
ceph daemon osd.0 bluestore bluefs stats
ceph daemon osd.0 config get bluestore_block_db_path
ceph daemon osd.0 config get bluestore_block_wal_path
```

List OSD device mappings:

```bash
ceph osd metadata osd.0 | python3 -m json.tool | grep -E "osd_objectstore|bluestore"
```

## Sizing Guidelines

Minimum DB device size per OSD based on data device capacity:

| Data Device | Recommended DB Size | WAL Size |
|-------------|--------------------|----|
| 1 TB HDD | 4-10 GB | 512 MB |
| 4 TB HDD | 10-20 GB | 1 GB |
| 8 TB HDD | 20-40 GB | 2 GB |
| 1 TB NVMe | 5 GB | 512 MB |

If the DB device fills up, BlueStore spills to the main data device. Monitor this:

```bash
ceph daemon osd.0 bluestore bluefs stats | grep db_used
```

## Configuring Separate WAL/DB in Rook

Specify metadata device placement per OSD in the CephCluster:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    nodes:
    - name: "node1"
      devices:
      - name: "sda"
        config:
          metadataDevice: "nvme0n1"
      - name: "sdb"
        config:
          metadataDevice: "nvme0n1"
      - name: "sdc"
        config:
          metadataDevice: "nvme0n1"
```

One NVMe can serve as metadata device for multiple HDD OSDs. A rule of thumb is 1 NVMe per 4-6 HDDs.

## Tuning BlueStore RocksDB Compaction

Adjust RocksDB compaction settings to reduce write amplification:

```bash
# Increase memtable size to batch more writes before flushing
ceph config set osd bluestore_rocksdb_options \
  "compression=kNoCompression,max_write_buffer_number=4,\
min_write_buffer_number_to_merge=1,recycle_log_file_num=4,\
write_buffer_size=268435456,writable_file_max_buffer_size=0,\
compaction_readahead_size=2097152"
```

Enable BlueStore cache for DB objects:

```bash
ceph config set osd bluestore_cache_kv_ratio 0.4   # 40% of cache for RocksDB
ceph config set osd bluestore_cache_meta_ratio 0.4 # 40% for metadata
ceph config set osd bluestore_cache_data_ratio 0.2 # 20% for data objects
```

## Monitoring WAL/DB Utilization

Track database file sizes and I/O:

```bash
# Check DB device utilization
for osd in $(ceph osd ls); do
  echo "OSD $osd DB usage:"
  ceph daemon osd.$osd bluestore bluefs stats 2>/dev/null | grep -E "db|wal" | head -5
done
```

Use iostat to monitor the metadata device specifically:

```bash
iostat -x nvme0n1 5 | awk '/nvme0n1/ {print "util:", $NF"%", "r/s:", $4, "w/s:", $5}'
```

## Migrating Existing OSDs

If OSDs are already deployed without a separate metadata device, you can migrate:

```bash
# Stop the OSD
systemctl stop ceph-osd@0

# Use ceph-bluestore-tool to migrate DB to a new device
ceph-bluestore-tool bluefs-bdev-migrate \
  --path /var/lib/ceph/osd/ceph-0 \
  --devs-source /dev/sda \
  --dev-target /dev/nvme0n1

# Restart the OSD
systemctl start ceph-osd@0
```

## Summary

BlueStore WAL and DB devices dramatically impact OSD write performance - placing them on NVMe while keeping data on HDDs achieves near-SSD random write IOPS at HDD cost per GB. Size DB devices according to the data device capacity (see the sizing table above). In Rook, specify the `metadataDevice` field per OSD to let the operator configure separate WAL/DB placement automatically.
