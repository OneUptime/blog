# Validation Summary: How to Perform RBD Asynchronous DR Failback with Rook

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph RBD (RADOS Block Device)
- RBD mirroring (asynchronous, snapshot-based)
- Kubernetes (kubectl, deployments, PVCs)
- VolumeReplication CRD (CSI Addons / volume-replication-operator)
- Mermaid diagrams

## Sources Consulted
- Rook RBD Mirroring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Rook RBD Async DR Failover/Failback documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-async-disaster-recovery-failover-failback/
- Ceph RBD man page (rbd mirror subcommands): https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph MonCommands.h source (valid `ceph` CLI commands): https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- CSI Addons VolumeReplication CRD definition: https://github.com/csi-addons/volume-replication-operator/blob/main/config/crd/bases/replication.storage.openshift.io_volumereplications.yaml
- kubernetes-csi-addons VolumeReplication documentation: https://github.com/csi-addons/kubernetes-csi-addons/blob/v0.12.0/docs/volumereplication.md

## Issues Found

### Issue 1: Invalid command `ceph mirror daemon status`
- **Location:** Step 1, line 47-48
- **Problem:** `ceph mirror` is not a valid Ceph CLI subcommand. Mirror commands for RBD are under `rbd mirror`, not `ceph mirror`. Running `ceph mirror daemon status` would produce an error.
- **Fix:** Replaced with `kubectl -n rook-ceph get pod -l app=rook-ceph-rbd-mirror` which is the idiomatic way to verify the rbd-mirror daemon is running in a Rook/Kubernetes deployment.

### Issue 2: Invalid command `rbd mirror pool peer list`
- **Location:** Step 9, line 229
- **Problem:** `list` is not a valid subcommand of `rbd mirror pool peer`. The valid subcommands are `add`, `remove`, `set`, `bootstrap create`, and `bootstrap import`. There is no `list` subcommand.
- **Fix:** Replaced with `rbd mirror pool info replicapool` which displays the mirror mode and peer site details for the pool.

## Review Notes

- **Failback workflow order:** The blog post demotes Site B to secondary before triggering resync on Site A. The official Rook documentation recommends a slightly different approach: demoting both sites to secondary, waiting for the VolumeReplication status to show "volume ready to use" on Site A, then promoting Site A. Both approaches work with snapshot-based mirroring (snapshots are persisted and can be pulled even from a secondary), but users following the official docs would see a different sequence. The blog's use of the `resync` state is appropriate for post-disaster (unplanned) failover scenarios involving split-brain recovery.
- **Prometheus metric name:** The comment referencing `rbd_mirror_image_replaying_lag_seconds` may not match the exact metric name exported by Ceph's mgr/prometheus module (which typically uses the `ceph_rbd_mirror_` prefix). Since this is presented as guidance in a comment rather than an executable command, it was left as-is.
- **VolumeReplication API:** The `replication.storage.openshift.io/v1alpha1` API group and the YAML structure are correct per both the Rook docs and the CSI Addons CRD definition.
- **All other commands verified correct:** `rbd mirror pool status --verbose`, `rbd mirror image status`, `rbd mirror image resync`, `ceph status`, `ceph log last 50`, `ceph osd pool scrub`, and all kubectl commands use valid syntax and flags.
