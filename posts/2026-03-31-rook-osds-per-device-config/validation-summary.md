# Validation Summary: How to Configure osdsPerDevice in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes
- BlueStore (Ceph OSD backend)
- LVM (Logical Volume Manager)
- CRUSH map

## Sources Consulted
- Rook CephCluster CRD documentation (rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook official `cluster.yaml` example in the Rook GitHub repository
- Rook source code (`volume.go`, `device.go`) for osdsPerDevice and LVM mode behavior
- Ceph `ceph-volume lvm batch` documentation (docs.ceph.com/en/latest/ceph-volume/lvm/batch/)
- Ceph OSD configuration reference (`osd_op_num_shards_ssd`, `osd_op_num_threads_per_shard_ssd`)
- Ceph BlueStore configuration reference (`osd_memory_target` default: 4 GiB)
- Ceph CRUSH map documentation

## Issues Found

1. **Incorrect OSD threading claim**: The post stated "Ceph OSD processes are single-threaded for their core I/O path." This is wrong. Ceph OSDs are multi-threaded — an SSD-backed OSD runs 8 shards x 2 threads = 16 op worker threads by default, plus messenger threads and other background threads. The motivation for multiple OSDs per device is lock contention and per-PG serialization, not single-threadedness. **Fixed** the paragraph to accurately describe the multi-threaded nature and the real bottleneck (lock contention and per-PG serialization).

2. **Incorrect "partition" terminology**: The post said "Ceph will partition each device and assign a separate OSD process to each partition." When `osdsPerDevice > 1`, Rook forces LVM mode (not raw mode) and creates LVM logical volumes, not partitions. **Fixed** to say Rook uses LVM mode to create logical volumes.

3. **Wrong pod for ceph-volume command**: The post showed `ceph-volume lvm list` being run from `deploy/rook-ceph-tools` (the toolbox pod). The `ceph-volume` tool is not installed in the toolbox — it is only available in OSD pods. **Fixed** the command to use an OSD pod and added a clarifying note.

4. **Incorrect metadataDevice description**: The post said "Each of the four OSD partitions gets its own DB and WAL partition on the metadata device." This had two errors: (a) the allocations are LVM logical volumes, not partitions; (b) WAL is co-located with DB by default unless `--wal-devices` is explicitly specified. **Fixed** to reference DB logical volumes and note WAL co-location.

## Review Notes
- The memory estimate of "1-4 GiB" per OSD is reasonable but the low end (1 GiB) only applies if `osd_memory_target` is explicitly lowered. The default `osd_memory_target` is 4 GiB. Users following this guide with default settings should plan for ~4 GiB per OSD.
- The drive size / osdsPerDevice recommendation table is reasonable general guidance but not from any official source. Users should benchmark their specific workloads.
- The YAML CRD examples are syntactically correct and match official Rook examples. The `apiVersion: ceph.rook.io/v1` is current.
