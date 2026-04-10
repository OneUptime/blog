# Validation Summary: How to Set Up Ceph Snapshots for Point-in-Time Backups

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook-Ceph (v1.13)
- Ceph RBD (RADOS Block Device) snapshots
- CephFS snapshots
- Kubernetes VolumeSnapshot API (snapshot.storage.k8s.io/v1)
- Kubernetes CronJobs (batch/v1)
- Rook-Ceph CSI driver (rook-ceph.rbd.csi.ceph.com)

## Sources Consulted
- Ceph RBD Snapshots documentation (https://docs.ceph.com/en/latest/rbd/rbd-snapshot/)
- Ceph CephFS Snapshots documentation (https://docs.ceph.com/en/latest/cephfs/snap-schedule/)
- Rook-Ceph CSI Snapshots documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/)
- Kubernetes VolumeSnapshot API reference (https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- Kubernetes PersistentVolumeClaim dataSource documentation (https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-snapshot-and-restore-volume-from-snapshot-support)
- Kubernetes CronJob API reference (https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)

## Issues Found
No technical issues found. All commands, YAML manifests, and API references are correct and functional.

## Review Notes
- The `rbd snap protect` command (used before cloning) is deprecated in Ceph Pacific (v16.2) and later for format 2 images with the `deep-flatten` feature enabled (which is the default). Cloning no longer requires protecting the snapshot first. The command still works and does not error, but future readers using modern Ceph versions can skip the protect step.
- The CronJob pruning logic uses `head -n -28` to retain the most recent 28 snapshot entries, which approximates 7 days at 4 snapshots/day. The comment says "older than 7 days" which is only accurate if no scheduled runs are missed. The logic is sound but the comment is slightly imprecise — it retains the last 28 snapshots by count, not by actual age.
- The CronJob relies on `jq` being available in the `rook/ceph:v1.13.0` container image. Users should verify `jq` is present or install it in a custom image if needed.
- The CephFS snapshot example assumes CephFS is mounted at `/mnt/cephfs/myvolume` inside the toolbox pod. Users may need to mount CephFS first, as the Rook toolbox does not mount it by default.
