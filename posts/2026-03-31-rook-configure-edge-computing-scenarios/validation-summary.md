# Validation Summary: How to Configure Rook-Ceph for Edge Computing Scenarios

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system) — BlueStore, RGW multisite, OSD tuning
- Kubernetes (CephCluster CRD, ConfigMaps, resource requests/limits)
- K3s (lightweight Kubernetes for edge)
- radosgw-admin CLI

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph configuration (rook-config-override): https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-configuration/
- Ceph pool operations (size, min_size, mon_allow_pool_size_one): https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph BlueStore configuration reference (osd_memory_target, bluestore_cache_autotune): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph RGW multisite documentation: https://docs.ceph.com/en/quincy/radosgw/multisite/
- radosgw-admin man page: https://docs.ceph.com/en/reef/man/8/radosgw-admin/
- K3s packaged components (--disable flag): https://docs.k3s.io/installation/packaged-components

## Issues Found

1. **Missing `--yes-i-really-mean-it` flag and `mon_allow_pool_size_one` for pool size 1.**
   - *What was wrong:* The command `ceph osd pool set edge-data size 1` was missing the required `--yes-i-really-mean-it` flag. Additionally, in Ceph Pacific and later, `mon_allow_pool_size_one` must be set to `true` before a pool size of 1 is allowed.
   - *What was changed:* Added `ceph config set global mon_allow_pool_size_one true` command before the size-setting command, and appended `--yes-i-really-mean-it` to the `ceph osd pool set edge-data size 1` command.
   - *Why:* Without these, the command fails with an error in modern Ceph versions.

2. **`bluestore_cache_size` ignored when `osd_memory_target` is set (autotune is on by default).**
   - *What was wrong:* The ConfigMap set both `osd_memory_target = 1073741824` and `bluestore_cache_size = 536870912`. Since `bluestore_cache_autotune` is enabled by default (since Ceph Mimic), the `bluestore_cache_size` value is silently ignored — BlueStore auto-tunes its cache within the `osd_memory_target` budget.
   - *What was changed:* Removed `bluestore_cache_size` and updated the comments to explain that BlueStore cache is auto-tuned within the `osd_memory_target`.
   - *Why:* Setting a dead config option is misleading and could confuse readers into thinking they have finer control than they do.

3. **Incorrect terminology: "RGW lifecycle policies" for multisite replication.**
   - *What was wrong:* The text said "use RGW lifecycle policies to replicate to a central cluster." RGW lifecycle policies are for object expiration and tiering, not replication. The commands shown are for RGW multisite zone replication.
   - *What was changed:* Changed "RGW lifecycle policies" to "RGW multisite replication."
   - *Why:* These are distinct Ceph features; conflating them would mislead readers.

4. **Misleading comment on `radosgw-admin sync policy get`.**
   - *What was wrong:* The comment said "Set sync policy to push to central" but the command `sync policy get` only retrieves/displays the current sync policy — it does not set anything.
   - *What was changed:* Changed the comment to "Verify the current sync policy."
   - *Why:* The comment contradicted what the command actually does.

## Review Notes
- The `ceph osd pool create edge-data 16 16` command uses the older two-argument PG syntax (pg_num, pgp_num). In Nautilus+, pgp_num auto-follows pg_num so the second argument is redundant. This still works, so it was not changed, but newer Ceph versions also enable pg autoscaling by default which may override the manual PG count.
- The RGW multisite section is quite abbreviated — it shows zone creation and policy retrieval but omits the full multisite setup (realm creation, period update, access key configuration). This is noted as a content gap but not a technical error, as the section appears intended as a starting point rather than a complete guide.
- The Rook documentation now recommends using the `cephConfig` field in the CephCluster CRD for Ceph configuration when possible, with `rook-config-override` ConfigMap reserved for advanced or pre-bootstrap settings. Both approaches work.
