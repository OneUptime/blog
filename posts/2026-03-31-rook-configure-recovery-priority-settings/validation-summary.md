# Validation Summary: How to Configure Recovery Priority Settings in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD recovery priority configuration)
- Rook-Ceph (CephCluster CRD configuration)
- Kubernetes (kubectl exec for runtime changes)
- Prometheus (Ceph metrics monitoring)
- Bash scripting (scheduled priority adjustment)

## Sources Consulted
- Ceph OSD Configuration Reference — https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph Pool Operations — https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook CephCluster CRD Documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph Prometheus Module — https://docs.ceph.com/en/latest/mgr/prometheus/

## Issues Found

1. **Prometheus metric name `ceph_pg_recovering_bytes_per_sec` does not exist.**
   - **What was wrong:** The post referenced `ceph_pg_recovering_bytes_per_sec` as a Prometheus metric for monitoring recovery throughput. This is not a real Ceph Prometheus metric.
   - **What was changed:** Replaced with `rate(ceph_osd_recovery_bytes[5m])`, which uses the actual `ceph_osd_recovery_bytes` counter metric with a PromQL `rate()` function to compute bytes-per-second.
   - **Why:** The `ceph_osd_recovery_bytes` counter is the documented metric exported by Ceph's Prometheus module. Using `rate()` is the standard PromQL pattern for deriving per-second rates from counters.

2. **`ceph tell osd.* injectargs` misplaced under "Verify change took effect" heading.**
   - **What was wrong:** The `ceph tell osd.* injectargs` command was grouped under a "Verify change took effect" section, but it is an action command that applies configuration to running OSDs, not a verification step.
   - **What was changed:** Separated into its own "Apply to running OSDs immediately" subsection with an explanation that `ceph config set` persists the value but may not apply to already-running OSDs until restart. The verification section now contains only the `ceph config get` command.
   - **Why:** Mixing an action command with verification could mislead readers into thinking `injectargs` is a read-only check. The separation clarifies the two distinct operations.

## Review Notes
- The per-pool `recovery_priority` setting has a valid range of -10 to 10 (not 1-63 like the OSD-level settings). The post uses a value of 10 which is valid (it's the maximum), but it could benefit from a note clarifying this distinct range in a future update.
- The `osd_recovery_op_priority` default of 3 and `osd_client_op_priority` default of 63 were verified as correct for current Ceph releases (Reef/Squid).
- The Rook CephCluster CRD `spec.cephConfig` path is correct per Rook documentation.
- The bash scheduling script is syntactically correct and functionally sound.
