# Validation Summary: How to Set Up Ceph for Warm Storage Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (BlueStore, RGW, RBD)
- Kubernetes (StorageClass, StatefulSet, PVC)
- CephBlockPool and CephObjectStore CRDs
- AWS S3 API (lifecycle configuration via Ceph RGW)
- ClickHouse (analytics database, as an example consumer)

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-store-crd/
- Ceph BlueStore configuration reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph BlueStore compression documentation: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Ceph OSD configuration reference (thread tuning): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Rook CSI RBD StorageClass examples: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Cross-referenced with other validated Ceph blog posts in this repository (all-SSD clusters, NVMe clusters, memory profiling)

## Issues Found

### 1. Inaccurate `compression_mode: passive` comment (line 35)
- **What was wrong:** The inline comment read "Compress compressible data but skip already-compressed," which mischaracterizes how `passive` mode works. In Ceph BlueStore, `passive` means data is only compressed when the client/application explicitly sends a compressible hint via RADOS. It does not automatically detect compressibility.
- **What was changed:** Updated the comment to "Compress only when client sends a compressible hint."
- **Why:** The original wording could mislead readers into thinking passive mode auto-detects compressibility, when it actually depends on client-side hints.

### 2. Generic `osd_op_num_threads_per_shard` instead of SSD-specific variant (line 104)
- **What was wrong:** The post used the generic option `osd_op_num_threads_per_shard`, which sets thread count for all OSD device types. Since the blog specifically targets SSD warm storage, the device-class-specific option `osd_op_num_threads_per_shard_ssd` is more appropriate and avoids unintentionally affecting HDD OSDs in a mixed cluster.
- **What was changed:** Replaced `osd_op_num_threads_per_shard` with `osd_op_num_threads_per_shard_ssd`.
- **Why:** In a mixed cluster with both SSD and HDD device classes, the generic form would apply to all OSDs. The SSD-specific variant targets only the warm-tier OSDs as intended.

## Review Notes
- The `bluestore_cache_size_ssd` setting (4 GB) may be overridden by `osd_memory_target` autotuning, which is enabled by default in modern Ceph (Pacific+). The post could benefit from a note about this in a future update.
- The value 2 for `osd_op_num_threads_per_shard_ssd` is lower than the default of 5 for SSD OSDs. This is a reasonable choice for SATA/SAS SSDs which have less parallelism than NVMe, but readers should be aware the default is higher and may want to benchmark before lowering it.
- The ClickHouse StatefulSet YAML is an excerpt showing only `volumeClaimTemplates`. Required fields like `selector`, `serviceName`, and `template` are omitted. This is common in blog posts but readers should know the snippet is not a complete manifest.
- The lifecycle rule transitions to `StorageClass: "COLD"` which requires a pre-configured RGW storage class named COLD. The post does not mention this prerequisite.
- Performance expectations (IOPS, throughput, latency) are reasonable estimates for SATA/SAS SSD-backed Ceph clusters, though actual numbers vary significantly by hardware and configuration.
