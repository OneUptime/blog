# Validation Summary: How to Deploy Ceph on Edge Computing Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph Reef (v18.2.0)
- Kubernetes
- BlueStore (Ceph storage backend)
- mClock (Ceph OSD scheduler)

## Sources Consulted
- [Rook Network Providers Documentation](https://rook.io/docs/rook/latest-release/CRDs/Cluster/network-providers/) — verified `selectors` vs `addressRanges` usage with host networking
- [Rook CephCluster CRD Documentation](https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/) — verified CephCluster spec fields
- [Ceph Reef BlueStore Configuration Reference](https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/) — verified `osd_memory_target`, `bluestore_cache_size_*`, and `bluestore_cache_autotune` behavior
- [Ceph Reef OSD Configuration Reference](https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/) — verified recovery/backfill options
- [Ceph Reef mClock Configuration Reference](https://docs.ceph.com/en/reef/rados/configuration/mclock-config-ref/) — verified mClock override requirement for recovery settings
- [Ceph Hardware Recommendations](https://docs.ceph.com/en/reef/start/hardware-recommendations/) — verified minimum memory recommendations

## Issues Found

1. **Network isolation snippet used `selectors` with `provider: host` (line ~113-118)**
   - **What was wrong:** The `selectors` field (with values like `"eth0"`, `"eth1"`) is only valid with `provider: multus` and expects Multus NetworkAttachmentDefinition references, not bare interface names. With `provider: host`, selectors are not applicable.
   - **What was changed:** Replaced `selectors` with `addressRanges` using CIDR notation, which is the correct Rook field for specifying public and cluster networks with host networking.
   - **Why:** Confirmed against Rook documentation and consistent with other validated posts in this repository (rook-host-networking, rook-separate-public-cluster-networks).

2. **`bluestore_cache_size_hdd` and `bluestore_cache_size_ssd` set alongside `osd_memory_target` (line ~78-80)**
   - **What was wrong:** In Ceph Reef, `bluestore_cache_autotune` defaults to `true`. When autotuning is active, explicit `bluestore_cache_size_*` values are ignored — the autotuner manages cache sizing within the `osd_memory_target` budget. These two commands would have no effect.
   - **What was changed:** Removed the `bluestore_cache_size_hdd` and `bluestore_cache_size_ssd` commands, keeping only `osd_memory_target` which is the correct and sufficient approach for Reef.
   - **Why:** Per Ceph documentation and mailing list discussions, `osd_memory_target` with autotuning enabled is the recommended approach; explicit cache sizes are only meaningful when autotuning is disabled.

3. **`osd_memory_target` set to 1 GB (1073741824) (line ~78)**
   - **What was wrong:** Ceph documentation explicitly warns: "Setting the osd_memory_target below 2GB is not recommended" — performance will be "extremely slow" and the OSD may not be able to stay within the limit.
   - **What was changed:** Updated `osd_memory_target` to `2147483648` (2 GB). Also updated the hardware section text from "reduce to 1 GB with tuning" to "minimum recommended by Ceph".
   - **Why:** Per Ceph Reef hardware recommendations and BlueStore configuration reference.

4. **Recovery/backfill commands used `global` instead of `osd` section (line ~103-106)**
   - **What was wrong:** The commands used `ceph config set global` for OSD-specific options. While `global` works (OSDs inherit from it), using the `osd` section is more precise and avoids potential conflicts if `osd`-level overrides exist.
   - **What was changed:** Changed `global` to `osd` in all three recovery commands.
   - **Why:** Best practice per Ceph configuration documentation; the `osd` section takes precedence over `global` for OSD daemons.

5. **Missing `osd_mclock_override_recovery_settings` for Ceph Reef (line ~103)**
   - **What was wrong:** In Ceph Reef, the mClock scheduler is the default OSD op scheduler. mClock overrides `osd_max_backfills`, `osd_recovery_max_active`, and `osd_recovery_op_priority` with its own internal values. Without enabling `osd_mclock_override_recovery_settings`, the manually set recovery tuning commands have no effect.
   - **What was changed:** Added `ceph config set osd osd_mclock_override_recovery_settings true` before the other recovery settings.
   - **Why:** Required for Ceph Reef (v18.x) per the mClock configuration reference. Without this, the recovery tuning section is effectively a no-op.

## Review Notes
- The `osd_max_backfills` default in Ceph Reef is already `1`, and `osd_recovery_op_priority` default is already `3`. Setting them explicitly is not wrong (it documents intent and guards against future default changes), but readers should know these are already the defaults.
- The `osd_recovery_max_active` option has been split into `osd_recovery_max_active_hdd` (default 3) and `osd_recovery_max_active_ssd` (default 10) since Nautilus. Setting the generic `osd_recovery_max_active` to a non-zero value overrides both, which is fine for simplicity in edge deployments but could be noted for readers with mixed media.
- The CephBlockPool spec sets `pg_num: "32"` manually. In Ceph Reef, the PG autoscaler is enabled by default and may adjust this value. This is acceptable for edge deployments where manual control is preferred, but readers should be aware of the autoscaler interaction.
- The Ceph image `quay.io/ceph/ceph:v18.2.0` is a valid Reef release. Readers should check for newer point releases (e.g., v18.2.4) for security and bug fixes.
