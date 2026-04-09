# Validation Summary: How to Write an Example ceph.conf for Production

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- BlueStore (Ceph OSD backend)
- CephX (Ceph authentication)
- RBD (RADOS Block Device) client caching
- Kubernetes CRDs (CephCluster CR)

## Sources Consulted
- [Ceph Configuration - Rook Ceph Documentation](https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-configuration/) — verified `cephConfig` field exists and YAML format is correct
- [CephCluster CRD - Rook Ceph Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/) — confirmed CephCluster CR spec structure
- [Rook CephCluster example cluster.yaml](https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml) — confirmed cephConfig usage pattern
- [Configuring Monitor/OSD Interaction - Ceph Documentation](https://docs.ceph.com/en/reef/rados/configuration/mon-osd-interaction/) — verified `mon_osd_min_in_ratio`, `mon_osd_full_ratio`, `mon_osd_nearfull_ratio`, `mon_osd_backfillfull_ratio`
- [OSD Config Reference - Ceph Documentation](https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/) — verified OSD scrub, recovery, heartbeat, and BlueStore cache settings
- [Rook rook-config-override documentation](https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/ceph-configuration.md) — cross-referenced alternative ConfigMap approach

## Issues Found
No technical issues found.

## Review Notes
- The `cephConfig` field in the CephCluster CR is confirmed as the recommended approach. The older `rook-config-override` ConfigMap method still exists for settings that must be applied before monitors reach quorum, but the blog's use of `cephConfig` is the current best practice.
- Several settings in the example (`osd_objectstore = bluestore`, `bluestore_cache_size_hdd = 1073741824`, `bluestore_cache_size_ssd = 3221225472`, `osd_deep_scrub_interval = 604800`) match their default values. This is not incorrect — explicitly stating defaults improves clarity for production configs — but readers should be aware these are defaults.
- The `osd_objectstore = bluestore` setting is redundant in modern Ceph (Luminous and later), as BlueStore is the only supported backend. Not an error, but unnecessary.
- The RBD cache dirty ratios are aggressive (75% max dirty / 50% target dirty relative to cache size). This is a valid configuration but may not suit all workloads.
- Debug levels `0/1` (log level 0, memory level 1) are appropriate for production — level 0 suppresses log output while level 1 retains minimal in-memory debug info for crash dumps.
