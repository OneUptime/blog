# Validation Summary: How to Automate Ceph Upgrades with Rolling Strategy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI)
- Bash scripting

## Sources Consulted
- Rook Ceph Upgrade Documentation: https://rook.io/docs/rook/latest-release/Upgrade/ceph-upgrade/
- Rook Operator Upgrade Documentation: https://rook.io/docs/rook/latest-release/Upgrade/rook-upgrade/
- Rook Upgrade Design Document: https://github.com/rook/rook/blob/master/design/ceph/upgrade.md
- CephCluster CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

1. **Incorrect daemon upgrade order**: The post stated the Rook operator upgrades daemons in the order "MGR -> MON -> OSD -> MDS -> RGW -> RBD Mirror". The correct order is "MON -> MGR -> OSD -> MDS -> RGW -> RBD Mirror" -- Monitors (MON) are upgraded first, followed by Managers (MGR). Monitors must be upgraded first because they maintain cluster quorum and are the foundation of the Ceph consensus layer. Fixed on line 21.

2. **Non-existent pause/resume annotation**: The post used `ceph.rook.io/upgrade-paused="true"` as an annotation to pause upgrades. This annotation does not exist in Rook -- it is not referenced in the Rook source code or documentation. The correct way to pause a Rook upgrade is to scale down the operator deployment (`kubectl -n rook-ceph scale deployment rook-ceph-operator --replicas=0`) and resume by scaling it back up to 1 replica. Fixed the "Pausing and Resuming Upgrades" section and the corresponding mention in the Summary section.

## Review Notes
- The CephCluster YAML spec, kubectl commands, and automated upgrade script are all correct and follow current Rook conventions.
- The `ceph health --format json` output parsing using `['status']` key is correct for extracting the health status string.
- The `ceph pg stat | grep -v "active+clean"` approach for checking PG health is functional, though users should be aware that the output may include header lines that aren't PG states.
- The Ceph image tag `v18.2.4` refers to the Reef release series, which is a current and supported Ceph version.
