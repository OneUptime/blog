# Validation Summary: How to Configure Ceph for Hot Storage Workloads

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (BlueStore, RBD, OSD configuration)
- Kubernetes (StorageClass, StatefulSet, PVC)
- NVMe SSDs (hot storage hardware)
- PostgreSQL (example workload)
- FIO (benchmark tool)
- Prometheus / PromQL (latency alerting)

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph OSD Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- RocksDB Option String documentation: https://github.com/facebook/rocksdb/wiki/Option-String-and-Option-Map
- Rook CSI RBD StorageClass examples: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes StatefulSet API (apps/v1): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/stateful-set-v1/
- Ceph Prometheus module metrics: https://docs.ceph.com/en/reef/mgr/prometheus/
- FIO documentation: https://fio.readthedocs.io/en/latest/

## Issues Found

1. **`compression_mode: none` unquoted in CephBlockPool parameters** — Changed `none` to `"none"` for YAML safety. Bare `none` can be interpreted as null by some YAML parsers, and quoting it is consistent with the other quoted values (`"on"`, `"2"`) in the same parameters block.

2. **Wrong config option for disabling deferred writes** — The post used `bluestore_deferred_batch_ops 0` with a comment claiming it "disables deferred writes." This option controls batching of deferred operations, not whether deferred writes occur. Changed to `bluestore_prefer_deferred_size 0`, which is the correct option to disable deferred writes. (Note: on SSDs, `bluestore_prefer_deferred_size_ssd` defaults to 0 in modern Ceph, so deferred writes may already be off, but being explicit is good practice.)

3. **StorageClass missing controller-expand secret parameters** — The StorageClass had `allowVolumeExpansion: true` but was missing the required `csi.storage.k8s.io/controller-expand-secret-name` and `csi.storage.k8s.io/controller-expand-secret-namespace` parameters. Without these, volume expansion requests would fail. Added both parameters using `rook-csi-rbd-provisioner` (the default secret used for expansion).

4. **StatefulSet missing required fields** — The StatefulSet was missing `spec.serviceName` and `spec.selector` (with corresponding template labels), both of which are required in the `apps/v1` API. The Kubernetes API server would reject this manifest. Added `serviceName: postgres-hot`, `selector.matchLabels`, and `template.metadata.labels`.

5. **PromQL query used non-existent histogram metric** — The query used `ceph_osd_op_w_latency_bucket` with `histogram_quantile()`, but Ceph exposes OSD write latency as a summary type (with `_sum` and `_count` suffixes), not a histogram. There are no `_bucket` suffixes. Replaced with an average latency query using `rate(ceph_osd_op_w_latency_sum[5m]) / rate(ceph_osd_op_w_latency_count[5m])`. Updated the comment from "P99" to "average" accordingly.

## Review Notes
- The `osd_op_num_threads_per_shard` option (without the `_ssd` suffix) applies to all OSDs, not just NVMe. For mixed clusters, using `osd_op_num_threads_per_shard_ssd` would be more precise. Left as-is since it works correctly in an all-NVMe context.
- The `bluestore_cache_size_ssd` is correctly used — it targets only SSD-backed OSDs, which is appropriate for mixed-class clusters.
- The FIO benchmark command is correct. Adding `--time_based` alongside `--runtime=60` would ensure the test runs for the full 60 seconds even if the file is read completely before that, but this is a minor enhancement rather than an error.
- True P99 latency alerting would require histogram-type metrics that Ceph does not natively expose via its Prometheus module. The average latency query is the best available alternative with standard Ceph metrics.
