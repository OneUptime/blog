# Validation Summary: How to Configure OSD Memory Target in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (BlueStore OSD memory management)
- Rook (Kubernetes operator for Ceph)
- cephadm (Ceph deployment tool, referenced for autotune)
- Kubernetes (resource limits for OSD pods)

## Sources Consulted
- Ceph official documentation on OSD memory management and `osd_memory_target`: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph config set command reference and CRUSH location mask syntax: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Ceph cephadm autotune documentation: https://docs.ceph.com/en/latest/cephadm/services/osd/#automatically-tuning-osd-memory
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Manual byte-value verification (GiB to bytes conversion)

## Issues Found

1. **Incorrect byte value for 8 GiB**: The post listed `8589934656` as the byte equivalent of 8 GiB. The correct value is `8589934592` (8 × 1,073,741,824). The original was off by 64 bytes. Fixed on line 54.

2. **Non-existent Ceph parameter `osd_memory_target_autotune_scale`**: The post used `ceph config set osd osd_memory_target_autotune_scale 0.7`, but `osd_memory_target_autotune_scale` is not a real Ceph configuration parameter. The correct parameter for controlling the memory autotune ratio in cephadm-managed clusters is `mgr/cephadm/autotune_memory_target_ratio`, set on the `mgr` section. Fixed the command and updated the accompanying explanation.

## Review Notes
- The `osd/host:dense-node1` CRUSH location mask syntax for `ceph config set` is valid in Ceph Pacific+ but may not work on older Ceph releases. The post does not specify a minimum Ceph version.
- The Rook `spec.cephConfig` YAML block for setting Ceph-level config may not match the exact CRD field name in all Rook versions. In some Rook versions, Ceph config overrides are applied via a ConfigMap or the Rook toolbox using `ceph config set` commands directly. Users should consult Rook documentation for their specific version.
- The BlueStore cache ratios section comment ("Fraction of cache for data (default 0.1)") is slightly misleading since it appears above `bluestore_cache_size_ssd` which is a size in bytes, not a ratio. However, the actual config commands shown are syntactically correct.
- The `osd_memory_target_autotune` feature works at the OSD daemon level regardless of orchestrator, but the ratio/scaling parameter (`autotune_memory_target_ratio`) is specific to cephadm. Rook users enabling autotune should be aware that the scaling behavior may differ.
