# Validation Summary: How to Check Cluster Status with ceph status and ceph -s

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (storage cluster management CLI)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Python 3 (for JSON parsing example)

## Sources Consulted
- Ceph official documentation for `ceph status` command and its JSON output structure (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph JSON output schema for `ceph status --format json` — specifically the `pgmap.pgs_by_state` array structure
- Rook documentation for the toolbox deployment (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- Rook CephCluster CRD status fields (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)

## Issues Found
1. **Incorrect JSON field path for PG state count (line 75)**: The Python script used `s['pgmap'].get('num_active_clean', 0)` to extract the count of active+clean PGs. However, the `pgmap` object in `ceph status --format json` output does not have a `num_active_clean` field. PG state information is provided in the `pgs_by_state` array, where each entry has `state_name` and `count` fields. The code would always return `0`. Fixed by iterating over `pgs_by_state` and summing counts where `state_name == 'active+clean'`.

## Review Notes
- The `osdmap` JSON path (`s['osdmap']['num_up_osds']`) is correct for current Ceph versions (Quincy 17.x, Reef 18.x) used by modern Rook deployments. Older Ceph versions (pre-Pacific) had a nested `osdmap.osdmap` structure — this is not a concern for current Rook users but worth noting for anyone running legacy clusters.
- The `watch` command inside the toolbox pod assumes the rook-ceph-tools image includes `watch`, which it does (based on CentOS/RHEL base image).
- The `kubectl get cephcluster` jsonpath command correctly queries the CRD status, though it requires that the CephCluster resource exists and has reported status.
