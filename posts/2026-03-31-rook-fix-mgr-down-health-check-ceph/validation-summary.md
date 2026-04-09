# Validation Summary: How to Fix MGR_DOWN Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (Manager daemon, health checks, MGR modules)
- Rook (CephCluster CRD, Kubernetes operator for Ceph)
- Kubernetes (kubectl, pod management, resource limits)
- systemd (bare metal Ceph service management)

## Sources Consulted
- Rook official example `cluster.yaml` from `rook/rook` GitHub repository (`deploy/examples/cluster.yaml` on `master` and `release-1.16` branches)
- Rook CephCluster CRD Go type definitions (`pkg/apis/ceph.rook.io/v1/types.go`) confirming `ResourceSpec` is a top-level map under `spec.resources`
- Ceph official documentation for `ceph mgr` commands (`ceph mgr stat`, `ceph mgr fail`, `ceph mgr module disable`)
- Ceph health checks documentation for `MGR_DOWN` warning

## Issues Found
1. **Incorrect YAML path for MGR resource limits in Rook**: The post originally showed MGR resources nested under `spec.mgr.resources`, but in the Rook CephCluster CRD, daemon resource limits are specified under the top-level `spec.resources` map with the daemon name as a key. The correct path is `spec.resources.mgr`. The `spec.mgr` section only supports `count`, `allowMultiplePerNode`, and `modules` fields. Fixed the YAML snippet and accompanying text to use `spec.resources.mgr`.

## Review Notes
- All Ceph CLI commands (`ceph health detail`, `ceph mgr stat`, `ceph mgr fail`, `ceph mgr module disable`) are correct and current.
- The kubectl commands use correct flags and label selectors for Rook MGR pods.
- The systemd service name pattern `ceph-mgr@$(hostname)` is correct for bare metal deployments.
- The `jq` expression `.active_name` correctly extracts the active manager name from `ceph mgr stat` JSON output.
- The listed common faulty modules (dashboard, pg_autoscaler, telemetry) are all real MGR modules that can cause crash loops.
- The post correctly notes that the cluster can continue I/O without an active MGR, which is accurate since MGR handles monitoring and orchestration but not data path operations.
