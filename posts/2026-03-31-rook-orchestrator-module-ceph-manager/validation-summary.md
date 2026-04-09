# Validation Summary: How to Configure the Orchestrator Module in Ceph Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph Manager Orchestrator module
- Rook (Kubernetes-based Ceph orchestrator)
- cephadm (container-based Ceph orchestrator)
- Kubernetes CRDs (CephCluster)
- Ceph CLI (`ceph orch` commands)

## Sources Consulted
- Ceph Orchestrator module documentation: https://docs.ceph.com/en/latest/mgr/orchestrator/
- Ceph Orchestrator module developer docs: https://docs.ceph.com/en/latest/mgr/orchestrator_modules/
- Cephadm documentation: https://docs.ceph.com/en/latest/cephadm/
- Ceph host management docs (labels and placement): https://docs.ceph.com/en/latest/cephadm/host-management/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook example cluster.yaml: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml

## Issues Found

1. **`ssh` listed as a current orchestrator backend (lines 19, 11, 115):** The `ssh` orchestrator module existed in Ceph Nautilus (v14) but was replaced by `cephadm` starting with Ceph Octopus (v15.2.0, released 2020). The official Ceph orchestrator docs only list `rook` and `cephadm` as supported backends. Removed `ssh` from the backends list, the intro paragraph, and the summary.

2. **Inaccurate `cephadm` description (line 18):** The original described cephadm as "Uses the cephadm bootstrap tool." This is misleading — cephadm manages the full daemon lifecycle (deployment, updates, removal) using SSH and containers (Podman/Docker), not just bootstrapping. Fixed to: "Manages the full daemon lifecycle using SSH and containers (the default backend since Octopus)."

3. **Missing prerequisite `ceph mgr module enable` command (line 26):** The `ceph orch set backend rook` command requires the rook manager module to be enabled first. Added `ceph mgr module enable rook` before the set backend command.

4. **Incorrect label format in comment (line 106):** The comment said "nodes labeled with storage=true" but Ceph host labels are simple free-form strings, not key=value pairs. Labels are applied via `ceph orch host label add <host> <label>`. Fixed comment to: "nodes with the Ceph host label 'storage'".

## Review Notes
- The CephCluster CRD YAML snippet is a simplified excerpt showing only `spec.mon.count` and `spec.mgr.count`. These fields are valid but a real CephCluster resource requires additional fields (e.g., `dataDirHostPath`, storage configuration). This is acceptable for illustrative purposes.
- All `ceph orch` CLI commands (`host ls`, `ls`, `ps`, `apply osd --all-available-devices`, `apply mon --placement="3"`) were verified as correct against official Ceph documentation.
- The placement spec syntax (`label:<label>` and host-list formats) is correct per the Ceph orchestrator placement specification docs.
