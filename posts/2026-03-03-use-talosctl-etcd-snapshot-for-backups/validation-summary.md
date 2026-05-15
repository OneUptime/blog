# Validation Summary: How to Use talosctl etcd snapshot for Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd and etcdutl
- Kubernetes CronJob
- Bash
- AWS S3-compatible object storage
- Cron

## Sources Consulted
- Talos Linux Disaster Recovery documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- etcd disaster recovery documentation: https://etcd.io/docs/v3.7/op-guide/recovery/
- etcd database snapshot documentation: https://etcd.io/docs/v3.7/tasks/operator/how-to-save-database/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/#cronjob-v1-batch
- Sidero Labs talosctl container package: https://github.com/orgs/siderolabs/packages/container/package/talosctl

## Issues Found
- The snapshot verification example used `etcdctl snapshot status`. Current etcd documentation uses `etcdutl snapshot status` for inspecting snapshot metadata, so the command and surrounding text were updated to `etcdutl`.
- The S3 upload script wrote into `/tmp/etcd-backups` without creating the directory first. Added `mkdir -p "$BACKUP_DIR"` before creating the snapshot.
- The examples pinned older Talos and Kubernetes versions (`v1.7.0` and Kubernetes `1.30.0`). Updated the example Talos image tags to `v1.12.1` and the Kubernetes upgrade target to `1.35.0` to align with current official Talos CLI reference examples.
- The best-practices list recommended targeting a non-leader etcd member. The Talos documentation states that a snapshot can be taken from any healthy control plane node because all etcd instances contain the same data, so the recommendation was changed to target any healthy control plane node.

## Review Notes
The Kubernetes CronJob manifest is structurally valid for `batch/v1`, but it assumes that a `talosconfig` Secret with a `config` key and an `etcd-backup-pvc` PersistentVolumeClaim already exist. That is acceptable for the scope of the example, but a future post could call out those prerequisites explicitly.
