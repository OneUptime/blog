# Validation Summary: How to Tune BlueStore Memory Allocation in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph BlueStore
- Ceph OSD memory autotuning (`osd_memory_target`)
- RocksDB block cache within BlueStore
- Rook Ceph Operator (CephCluster CRD)
- Kubernetes resource limits

## Sources Consulted
- Ceph official documentation on BlueStore config: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph official documentation on memory autotuning: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook documentation on CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook documentation on Ceph config override: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found

1. **Invalid Rook CRD field `configFileOverride`**: The post used `spec.configFileOverride` to inject ceph.conf overrides into a Rook CephCluster resource. This field does not exist in the Rook CephCluster CRD. **Fix**: Replaced with the correct approach using a `rook-config-override` ConfigMap, which is the standard Rook mechanism for injecting custom ceph.conf settings.

2. **Incorrect monitoring command `ceph osd perf dump`**: The post suggested using `ceph osd perf dump | grep -i mem` to watch OSD memory consumption. However, `ceph osd perf dump` only outputs latency statistics (commit_latency_ms, apply_latency_ms), not memory-related data. **Fix**: Changed to `ceph daemon osd.0 perf dump | grep -i cache`, which accesses the daemon-level perf counters that include BlueStore cache statistics.

## Review Notes
- The HDD vs SSD cache ratio example sets `bluestore_cache_kv_ratio` globally twice (once to 0.2, then to 0.4). Since both commands target the `osd` section, the second value overrides the first for all OSDs. To truly differentiate, per-OSD config (e.g., `ceph config set osd.0 bluestore_cache_kv_ratio 0.2`) would be needed. This is not strictly wrong but could be misleading in practice.
- The `ceph daemon` commands require running inside the OSD container or host with access to the admin socket. In a Rook environment, this typically means exec-ing into the OSD pod first, which is not mentioned.
- Byte calculations for all memory values are correct (e.g., 9 GiB = 9663676416, 8 GiB = 8589934592, etc.).
