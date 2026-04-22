# How to Separate OSD WAL and DB Partitions to Faster Drives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, BlueStore, Performance

Description: Configure Ceph BlueStore OSD WAL and DB partitions on separate fast NVMe or SSD drives to improve write throughput and metadata performance.

---

## BlueStore WAL and DB Overview

BlueStore OSDs use two optional metadata components that can live on a separate faster device:

- **WAL (Write-Ahead Log)**: Journals small writes before they are committed to the main data device. Roughly 1-2 GB per OSD is sufficient.
- **DB (RocksDB metadata database)**: Stores all BlueStore metadata including object keys and extents. Recommended size is 1-4% of the OSD's data capacity (4% for RGW workloads, 1-2% for RBD).

Placing the WAL and DB on NVMe or SSD drives while keeping bulk data on HDDs dramatically improves write latency and metadata operations. When the DB fills up, BlueStore automatically spills overflow to the main data device, so sizing is important but not catastrophic if undersized.

## Configuring WAL and DB in Rook

In the `CephCluster` resource, specify separate devices for WAL and DB using `metadataDevice` or per-OSD configuration:

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
          metadataDevice: nvme0n1
      - name: sdc
        config:
          metadataDevice: nvme0n1
      - name: sdd
        config:
          metadataDevice: nvme0n1
```

The `metadataDevice` field places both WAL and DB on the specified device. Rook automatically partitions the NVMe drive to host metadata for all assigned HDDs.

## Controlling WAL and DB Partition Sizes

Rook does not support placing WAL and DB on separate devices via config keys - `metadataDevice` always places both on the same device. However, you can control the size of each partition using `databaseSizeMB` and `walSizeMB`:

```yaml
spec:
  storage:
    nodes:
    - name: worker-1
      devices:
      - name: sdb
        config:
          metadataDevice: nvme0n1
          databaseSizeMB: "1024"
          walSizeMB: "512"
```

For PVC-based clusters, WAL and DB can be placed on different volume types using separate `volumeClaimTemplates` entries with names `data`, `metadata` (for block.db), and `wal` (for block.wal).

## Sizing Guidelines

For each HDD OSD, reserve the following space on the fast device:

```text
DB  = OSD capacity * 0.01 to 0.04 (use 0.04 for RGW workloads, 0.01-0.02 for RBD)
WAL = 1-2 GB per OSD
```

For 4 x 8 TB HDD OSDs per node with RGW workload:

```text
DB  = 4 * 8000 GB * 0.04 = 1280 GB
WAL = 4 * 2 GB = 8 GB
Total NVMe needed = ~1288 GB
```

For RBD workloads, 1-2% is sufficient, so the same setup would need only ~320-640 GB for DB.

## Verifying Placement

After deployment, confirm WAL and DB placement from the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata osd.0 | grep -E "bluefs|wal|db"
```

Look for `bluefs_db_type` and `bluefs_wal_type` showing `ssd` or `nvme`.

## Benchmark Before and After

Measure write latency improvement with a simple bench test. First create a test image, then run the benchmark:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create benchimage --size 10G

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd bench --io-type write --io-size 4096 --io-threads 16 --io-total 1G benchimage
```

## Summary

Separating BlueStore WAL and DB onto NVMe drives while keeping bulk data on HDDs is one of the highest-impact performance optimizations for Ceph. Rook exposes this via the `metadataDevice` config key in the `CephCluster` storage configuration, which places both WAL and DB on the specified fast device. Use `databaseSizeMB` and `walSizeMB` to control partition sizes. Size the DB at 1-4% of OSD capacity (4% for RGW workloads) and provision at least 1-2 GB per OSD for the WAL to avoid spilling metadata back to the HDD.
