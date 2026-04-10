# Validation Summary: How to Add Storage Capacity to a Running Ceph Cluster

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (kubeadm, kubectl)
- Ceph OSDs (Object Storage Daemons)
- Ceph CRUSH / PG rebalancing

## Sources Consulted
- Rook official documentation: CephCluster CRD storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph official documentation: Adding/Removing OSDs (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Ceph official documentation: Recovery configuration options (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph official documentation: `ceph osd df` and `ceph pg dump` command reference (https://docs.ceph.com/en/latest/man/8/ceph/)

## Issues Found

### Issue 1: Incorrect column reference in `ceph pg dump osds` command
- **Location:** Step 6 - Monitor Rebalancing
- **What was wrong:** The command `ceph pg dump osds | awk '{print $1, $15}' | sort -n` used column `$15` which does not correspond to PG count. In `ceph pg dump osds` output, PG count is in column `$2`. Additionally, the awk/sort approach is fragile across Ceph versions.
- **What was changed:** Replaced with `ceph osd df` which directly shows per-OSD utilization and PG counts in a clear, version-stable format.

### Issue 2: Incorrect sort column in `ceph osd df` output
- **Location:** Step 8 - Verify Expansion Complete
- **What was wrong:** The command `ceph osd df | sort -k9 -rn` used column 9 to sort by utilization (`%USE`), but `%USE` is not in column 9 in modern Ceph versions. The exact column position varies across Ceph releases, making hard-coded column numbers unreliable.
- **What was changed:** Replaced with `ceph osd df tree` which provides a hierarchical view of OSD utilization without requiring version-specific column sorting.

## Review Notes
- The `osd_recovery_op_priority` value of 3 in Step 7 is actually the default value in most Ceph versions. Setting it explicitly is not harmful (and can serve as documentation), but it doesn't actually throttle recovery beyond the default behavior. The other two settings (`osd_recovery_max_active_hdd 2` and `osd_max_backfills 1`) are the effective throttling knobs.
- Steps 4-8 are presented as top-level sections (`##`) but logically serve as shared follow-up steps for both Option 1 and Option 2. This is a structural observation, not a technical error.
- The `storage-node=true` label in Option 2, Step 2 is a custom label used as an example. Users would need to ensure their Rook CephCluster CR has a matching `placement` configuration referencing this label for it to have any effect.
