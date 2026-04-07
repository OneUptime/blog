# Validation Summary: How to Roll Back a Failed Ceph Version Upgrade

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage)
- Kubernetes (kubectl CLI)
- CephCluster CRD (ceph.rook.io/v1)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/Upgrade/ceph-upgrade/
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph CLI reference for `ceph config set` commands
- Kubernetes kubectl annotation and cp command reference

## Issues Found
- **Invalid Ceph command `ceph osd set-recovery-delay 0`**: The subcommand `set-recovery-delay` does not exist in the Ceph CLI. Replaced with the correct command `ceph config set osd osd_recovery_delay_start 0`, which sets the OSD recovery delay start configuration option via Ceph's config management interface.

## Review Notes
- The `rook.io/do-not-reconcile=true` annotation is used to pause Rook reconciliation. An alternative approach commonly seen in practice is scaling down the Rook operator deployment (`kubectl scale deploy rook-ceph-operator --replicas=0`), which may be more reliable in some Rook versions.
- The post correctly warns about CRUSH map changes as a rollback limitation. This is an important caveat that is often overlooked.
- The `ceph tell osd.* version` wildcard syntax is correct and works as described.
- The CephCluster CRD structure (`spec.cephVersion.image`) and API version (`ceph.rook.io/v1`) are correct for current Rook versions.
