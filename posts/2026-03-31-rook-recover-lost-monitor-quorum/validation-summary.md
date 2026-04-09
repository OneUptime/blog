# Validation Summary: How to Recover from Lost Monitor Quorum in Ceph

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Ceph (monitor subsystem, Paxos consensus, monmap)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, deployments, pods, ConfigMaps)
- monmaptool (Ceph CLI utility)
- ceph-mon (Ceph monitor daemon)

## Sources Consulted
- Rook official disaster recovery documentation: https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/
- kubectl-rook-ceph plugin `mons restore-quorum` documentation: https://github.com/rook/kubectl-rook-ceph (docs/mons.md)
- Rook kubectl plugin automated restore-quorum output and step sequence (verified via GitHub API)

## Issues Found
1. **Missing operator scale-up step (critical)**: The blog scaled down the Rook operator to 0 replicas during recovery (`kubectl -n rook-ceph scale deploy rook-ceph-operator --replicas=0`) but never scaled it back up. The "Letting Rook Rebuild Monitors" section stated that Rook would detect the single-monitor state and create new monitors, but this is impossible with the operator at 0 replicas. The official `kubectl rook-ceph mons restore-quorum` tool explicitly scales the operator back up as one of its final steps. **Fix applied**: Added `kubectl -n rook-ceph scale deploy rook-ceph-operator --replicas=1` to the "Letting Rook Rebuild Monitors" section before the CephCluster spec check.

## Review Notes
- The official Rook documentation now recommends using the automated `kubectl rook-ceph mons restore-quorum <mon-name>` command from the kubectl-rook-ceph plugin rather than the manual procedure described in this post. The manual steps are still technically valid and educational, but a note mentioning the automated alternative would be a useful addition in a future update.
- The automated tool also updates the `rook-ceph-mon-endpoints` ConfigMap to reflect only the surviving monitor before restarting the operator. The blog omits this step. In practice the operator can usually reconcile stale ConfigMap entries on its own, but updating the ConfigMap beforehand is more robust. This is a minor improvement that could be added in a future revision.
- All `ceph-mon`, `monmaptool`, and `kubectl` commands in the post use correct syntax and flags. The `--mon-data` flag used with `ceph-mon` is a valid alternative to the `-i <mon-id>` shorthand and is clearer in containerized environments where the data directory path matters.
- The Paxos quorum explanation is accurate: 3 monitors require 2 for quorum, and losing 2 of 3 does cause total quorum loss.
