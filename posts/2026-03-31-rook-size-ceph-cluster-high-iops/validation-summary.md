# Validation Summary: How to Size a Ceph Cluster for High-IOPS Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- BlueStore (Ceph OSD backend)
- NVMe SSDs
- Kubernetes StorageClass, PVC, CSI
- fio (benchmarking tool)
- XFS filesystem

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph BlueStore configuration reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph OSD configuration reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph CLI reference (`ceph osd perf`, `ceph -w`): https://docs.ceph.com/en/latest/man/8/ceph/
- fio documentation: https://fio.readthedocs.io/

## Issues Found

### 1. Deprecated `storeType: bluestore` config key
- **What was wrong:** The CephCluster storage config included `storeType: bluestore`. BlueStore has been the only supported OSD backend since Ceph Nautilus, and this config key is no longer used in modern Rook versions.
- **What was changed:** Removed the `storeType: bluestore` line from the CephCluster YAML.
- **Why:** Including a deprecated/unused config key is misleading and could cause confusion or warnings in newer Rook releases.

### 2. Invalid `ceph --watch-debug` command
- **What was wrong:** The latency monitoring section used `ceph --watch-debug`, which is not a valid Ceph CLI command.
- **What was changed:** Replaced with `ceph -w`, which is the correct command for watching real-time cluster events.
- **Why:** `--watch-debug` is not a recognized flag. The valid options are `ceph -w` (watch mode) or `ceph -W debug` (debug-level event stream).

### 3. fio benchmark did not actually test Ceph storage
- **What was wrong:** The `kubectl run` command ran fio without mounting a PVC, so it would benchmark the container's ephemeral storage (not the Ceph volume).
- **What was changed:** Replaced with a proper PVC + Pod YAML spec that creates a PersistentVolumeClaim using the `rook-ceph-nvme-iops` StorageClass and mounts it into the fio container at `/data`.
- **Why:** Without mounting a Ceph-backed PVC, the benchmark results would be meaningless for evaluating Ceph IOPS performance.

## Review Notes
- The IOPS calculation section uses a simplified model (3 NVMe OSDs for 500K write IOPS with 3x replication). In practice, this leaves zero headroom since every write touches all OSDs. Real deployments would need significantly more OSDs for fault tolerance and headroom. The math is correct as presented but readers should understand this is a minimum theoretical calculation.
- The hardware section mentions consumer NVMe drives (Samsung 990 Pro, WD SN850X). Enterprise drives (e.g., Samsung PM9A3, Solidigm P5520) would be more appropriate for production Ceph clusters due to power-loss protection and sustained write endurance.
- The `osd_op_num_shards = 16` tuning value is aggressive. The default in modern Ceph is auto-tuned (0). This is not wrong but should be tested for each workload.
