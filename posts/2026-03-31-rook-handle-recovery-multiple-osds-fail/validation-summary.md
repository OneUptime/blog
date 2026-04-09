# Validation Summary: How to Handle Recovery When Multiple OSDs Fail Simultaneously

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (container orchestration)
- OSD (Object Storage Daemon) management
- PG (Placement Group) monitoring

## Sources Consulted
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph Adding/Removing OSDs: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph OSD Config Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph OSD Management: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Rook source code (OSD label definitions): https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/osd.go

## Issues Found

### 1. Critical threshold formula used wrong comparison operator
- **What was wrong:** The formula `down_osds >= (size - min_size)` used `>=` which is too aggressive. For a pool with size=3 and min_size=2, this would trigger a warning at just 1 down OSD, but a single OSD failure still leaves 2 copies available (meeting min_size). PGs would be degraded but not unavailable.
- **What was changed:** Changed `>=` to `>` so the threshold correctly indicates when PGs *may* become unavailable (i.e., when more OSDs are down than the replication tolerance allows).
- **Why:** With `>`, the heuristic correctly identifies when the number of failures exceeds the pool's built-in redundancy margin.

### 2. Temporary recovery section only unset 2 of 4 OSD flags
- **What was wrong:** The post set 4 flags (`norecover`, `nobackfill`, `norebalance`, `noout`) but the temporary recovery section only unset `noout` and `norebalance`, leaving `norecover` and `nobackfill` still active. This would prevent Ceph from actually recovering data.
- **What was changed:** Added `ceph osd unset nobackfill` and `ceph osd unset norecover` to the temporary recovery commands.
- **Why:** All four flags must be unset for Ceph to fully resume recovery operations. Leaving `norecover` and `nobackfill` set would silently block data recovery.

### 3. CephCluster YAML showed irrelevant `cleanupPolicy` field instead of OSD removal config
- **What was wrong:** The YAML snippet showed `spec.cleanupPolicy.allowUninstallWithVolumes: false`, which controls cluster teardown/uninstallation behavior, NOT OSD replacement. This field determines whether the CephCluster CR can be deleted when PVCs still exist — it has nothing to do with recovering or replacing individual OSDs.
- **What was changed:** Replaced with `spec.removeOSDsIfOutAndSafeToRemove: true`, which is the actual Rook mechanism for automatic OSD removal. Updated the surrounding text to accurately describe what this field does.
- **Why:** `removeOSDsIfOutAndSafeToRemove` tells the Rook operator to automatically purge OSD deployments that are marked `out` and confirmed safe to destroy by Ceph, which is the correct and relevant configuration for the OSD replacement workflow described in the post.

## Review Notes
- In modern Ceph (Quincy+), `osd_recovery_max_active` defaults to 0, deferring to device-type-specific variants `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd`. Setting it to a non-zero value like 1 still works as a global override, so the post's command is functional but could be modernized in the future.
- When using the mClock scheduler (default in Ceph Reef+), recovery throttling settings are overridden by mClock's own scheduling. To manually control them, `osd_mclock_override_recovery_settings = true` must be set. The post doesn't mention this caveat, which is acceptable since it doesn't target a specific Ceph version.
- The `ceph osd destroy` command requires the OSD to be marked as `down` first. In practice, `ceph osd purge` is often preferred as it combines `destroy` + `rm` + CRUSH removal in one step. The post's approach is valid but readers may want to consider `purge` for a cleaner workflow.
