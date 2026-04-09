# Validation Summary: How to Recover Rook-Ceph After Total Node Failure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI, node management, pod monitoring)
- kubectl-rook-ceph plugin

## Sources Consulted
- Rook Disaster Recovery Documentation: https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/
- kubectl-rook-ceph plugin mons docs: https://github.com/rook/kubectl-rook-ceph/blob/master/docs/mons.md
- Rook operator mon.go source: https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mon/mon.go
- Ceph Placement Groups Documentation: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph Troubleshooting PGs Documentation: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/
- Validated blog post in same repo: posts/2026-03-31-rook-restore-mon-quorum-command/validation-summary.md

## Issues Found
1. **Non-existent annotation for monitor quorum restoration**: The post used `ceph.rook.io/restore-mon-quorum` as a CephCluster annotation to restore monitor quorum. This annotation does not exist in Rook. The correct method is the `kubectl rook-ceph mons restore-quorum <mon-id>` command provided by the kubectl-rook-ceph plugin. Fixed the command and updated surrounding text to reference the plugin.

2. **Wrong command for handling incomplete Placement Groups**: The post recommended `ceph pg force-recovery <pg-id>` to resolve incomplete PGs after permanent OSD loss. This command only changes recovery priority for PGs already capable of recovering — it cannot resolve `incomplete` PGs where the underlying OSDs are permanently gone. Replaced with the correct two-step approach: (a) `ceph osd lost <osd-id> --yes-i-really-mean-it` to tell Ceph the OSDs are permanently gone, and (b) `ceph pg <pg-id> mark_unfound_lost delete` to clear any unfound objects if PGs remain stuck after re-peering.

## Review Notes
- The post correctly distinguishes between the two major recovery scenarios (nodes returning vs. permanently lost).
- All other kubectl commands, Ceph CLI commands (`ceph osd tree`, `ceph pg stat`, `ceph health detail`, `ceph osd stat`, `rados df`, `rados put/get`), and the CephCluster CR YAML structure are accurate.
- The default Rook data directory path (`/var/lib/rook/`) is correct.
- The `replicapool` pool name used in test commands is a standard Rook example pool name.
- The `deploy/rook-ceph-tools` toolbox deployment reference is correct for current Rook versions.
