# Validation Summary: How to Emergency Compact Ceph Monitor Store

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (monitor store / RocksDB)
- Kubernetes (Pods, PVCs, Deployments, kubectl)
- ceph-monstore-tool (offline compaction utility)

## Sources Consulted
- [ceph-mon man page (Ubuntu manpages)](https://manpages.ubuntu.com/manpages/focal/man8/ceph-mon.8.html) — verified ceph-mon command-line flags; `--compact` is not a valid flag
- [Ceph Monitor Config Reference](https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/) — verified `mon_compact_on_start` configuration option
- [IBM Storage Ceph: Compacting Monitor Store](https://www.ibm.com/docs/en/storage-ceph/7.0.0?topic=monitors-compacting-monitor-store) — verified compaction methods: `ceph tell`, `ceph-monstore-tool`, and `mon_compact_on_start`
- [Red Hat Ceph Storage 4 Troubleshooting Guide: Monitors](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/troubleshooting_guide/troubleshooting-ceph-monitors) — verified offline compaction with `ceph-monstore-tool`
- [ceph-monstore-tool man page](https://docs.ceph.com/en/latest/man/8/ceph-monstore-tool/) — verified syntax: `ceph-monstore-tool <path> compact`
- [Rook Ceph Configuration docs](https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/) — verified `cephConfig` section in CephCluster CR
- [Rook CephCluster CRD docs](https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/) — verified correct YAML structure for `cephConfig`
- [kubectl wait docs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/) — verified that `condition=complete` is for Jobs, not Pods
- [Ceph mon data storage compact/increase (blog)](https://swamireddy.wordpress.com/2019/11/20/ceph-mon-data-storage-compact-increase/) — verified compaction methods and `ceph tell mon.<id> compact` syntax

## Issues Found

1. **`ceph-mon --compact` is not a valid command-line flag.** The ceph-mon daemon does not accept a `--compact` flag. The correct tool for offline (daemon-stopped) compaction is `ceph-monstore-tool <store-path> compact`. Fixed the debug pod command from `ceph-mon --compact -i a --mon-data /var/lib/ceph/mon/ceph-a` to `ceph-monstore-tool /var/lib/ceph/mon/ceph-a compact`. Also updated the Summary section to reference `ceph-monstore-tool` instead of `ceph-mon --compact`.

2. **`ceph tell mon.* version` does not check monitor store size.** The post claimed this command checks "current monitor store size" but it actually returns the Ceph daemon version. Replaced this with `ceph daemon mon.a mon_status` and changed the heading text to "Check current monitor status" to be accurate.

3. **`kubectl wait --for=condition=complete pod/...` is invalid for Pods.** The `condition=complete` is a Job-level condition, not a Pod condition. Pods that run to completion transition to the `Succeeded` phase. Fixed to `kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/mon-compact-debug --timeout=300s`.

4. **Preventive measures YAML placed `mon_compact_on_start` under `storage.config`.** The `storage.config` section in a Rook CephCluster CR is for OSD-level settings, not monitor settings. The correct place for Ceph monitor configuration options is under `cephConfig.mon` in the CephCluster spec. Also removed `mon_rocksdb_options: "compaction_style=level"` which was in the wrong location and is not a standard way to set this in Rook. Fixed the YAML to use the proper `cephConfig` structure.

## Review Notes
- The `ceph-monstore-tool` syntax documented in various sources uses `ceph-monstore-tool <path> compact` (without `--` separator in newer versions). Some older documentation shows `ceph-monstore-tool <path> -- compact`. The post now uses the simpler form which works across versions.
- The Rook `cephConfig` feature requires monitors to be in quorum before settings are applied. For `mon_compact_on_start` to take effect on initial cluster bootstrap, the `rook-config-override` ConfigMap method may be needed instead. This is a nuance that could be added in a future update.
- The PVC name `rook-ceph-mon-a` follows the standard Rook naming convention and is correct.
- The pod labels `app=rook-ceph-mon` and `ceph_daemon_type=mon` are both valid Rook monitor pod selectors.
