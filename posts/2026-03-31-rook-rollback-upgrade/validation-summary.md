# Validation Summary: How to Roll Back a Failed Rook-Ceph Upgrade

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- Helm (Kubernetes package manager)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/
- Rook CephCluster CRD reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph documentation on upgrades: https://docs.ceph.com/en/latest/install/upgrading-ceph/
- Rook upgrade guide: https://rook.io/docs/rook/latest/Upgrade/rook-upgrade/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found

1. **Incorrect annotation name for pausing reconciliation**: The post used `rook.io/do-not-reconcile` which is not the correct annotation. Changed to `rook.io/pause-reconciliation` which is the documented Rook annotation for pausing operator reconciliation on a CephCluster CR. Fixed in two places (annotate and remove annotation commands) in the "Stop an In-Progress OSD Rolling Update" section.

2. **Invalid `ceph log last 100` command**: The `ceph log last` subcommand is not a reliable/standard Ceph CLI command. Replaced with `ceph -w` which is the standard command for watching cluster log events in real time. Fixed in the "Post-Rollback: Investigate Root Cause" section.

3. **Misleading Ceph downgrade support claim**: The post stated "Ceph supports downgrading within a minor version" which is inaccurate. Ceph does not officially support any downgrades. Reworded to clarify that while point release reverts (e.g., 18.2.4 → 18.2.2) are generally safe in practice, they are not officially supported. Also clarified that cross-major downgrades risk data corruption due to on-disk format changes.

4. **Missing operator reconciliation warning for manual daemon rollback**: The "Rollback a Specific Daemon Deployment" section suggested using `kubectl rollout undo` on individual daemon deployments without warning that the Rook operator would override these changes on the next reconciliation loop. Added instructions to pause and resume operator reconciliation around manual rollbacks.

## Review Notes
- The Helm rollback commands and `kubectl set image` approach for the operator are correct and well-documented.
- The CephCluster CRD YAML snippet uses correct field names (`spec.cephVersion.image`, `allowUnsupported`).
- The `ceph versions`, `ceph status`, `ceph health detail`, and `ceph osd stat` verification commands are all correct.
- The example Rook operator image `rook/ceph:v1.13.9` and Ceph image `quay.io/ceph/ceph:v18.2.2` are valid tags from the correct registries.
- The mermaid flowchart is syntactically correct and provides a useful decision tree.
