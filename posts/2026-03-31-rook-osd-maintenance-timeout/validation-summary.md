# Validation Summary: How to Configure OSD Maintenance Timeout in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- OSD (Object Storage Daemon) management
- PodDisruptionBudgets (Kubernetes disruption management)

## Sources Consulted
- Rook CephCluster CRD specification: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CRD specification (field definitions): https://rook.io/docs/rook/latest/CRDs/specification/
- Rook managed DisruptionBudgets design document: https://github.com/rook/rook/blob/master/design/ceph/ceph-managed-disruptionbudgets.md
- Rook OSD disruption source code (osd.go): https://github.com/rook/rook/blob/master/pkg/operator/ceph/disruption/clusterdisruption/osd.go
- Ceph Reef documentation — Monitor/OSD interaction: https://docs.ceph.com/en/reef/rados/configuration/mon-osd-interaction/
- Ceph Reef documentation — Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/

## Issues Found

1. **Incorrect claim that `osdMaintenanceTimeout` maps to `mon_osd_down_out_interval`** (Critical)
   - **What was wrong:** The post stated "Rook's `osdMaintenanceTimeout` maps to the Ceph `mon_osd_down_out_interval` configuration parameter." This is inaccurate. `osdMaintenanceTimeout` is a Rook operator-level PodDisruptionBudget management concept that controls how long the operator holds the `noout` flag on a CRUSH failure domain during a node drain. It does not set or map to `mon_osd_down_out_interval`, which is a separate native Ceph monitor timer (default 600 seconds).
   - **What was changed:** Rewrote the "How This Interacts with Ceph Internals" section to accurately describe the two-stage mechanism: Rook holds `noout` for the timeout duration, and after it's removed, Ceph's own `mon_osd_down_out_interval` governs the down-to-out transition.

2. **Misleading description of the 30-minute default** (Minor)
   - **What was wrong:** The post said "The default is 30 minutes, which means Ceph waits half an hour before marking a down OSD as out and starting backfill." This conflates the Rook `noout` flag hold time with Ceph's native OSD marking behavior.
   - **What was changed:** Updated to clarify that the 30-minute default means the Rook operator holds the `noout` flag for that duration during a drain, before allowing Ceph's own timers to take effect.

3. **Deprecated field `pgHealthCheckTimeout` in YAML example** (Minor)
   - **What was wrong:** The YAML example included `pgHealthCheckTimeout: 0`. This field exists in the CRD but is explicitly deprecated in the Rook specification ("DEPRECATED: PGHealthCheckTimeout is no longer implemented") and has no effect.
   - **What was changed:** Removed `pgHealthCheckTimeout` from the YAML example to avoid suggesting it is a functional configuration option.

## Review Notes
- All Ceph CLI commands in the post (`ceph config get`, `ceph osd stat`, `ceph status`, `ceph osd set/unset noout`, `ceph osd set/unset norebalance`) are syntactically correct and use valid flags.
- The `osdMaintenanceTimeout` field path (`spec.disruptionManagement.osdMaintenanceTimeout`) and its default value (30 minutes) are confirmed correct per the Rook specification.
- The `managePodBudgets: true` prerequisite is important — `osdMaintenanceTimeout` only has effect when `managePodBudgets` is enabled. The post includes this in the YAML but does not explicitly call out the dependency in prose.
- The recommended timeout values table provides reasonable guidance, though the scenarios are advisory rather than verifiable claims.
- The `noout` and `norebalance` flag usage for extended maintenance is a well-documented best practice in Ceph administration.
