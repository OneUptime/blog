# Validation Summary: How to Set Up etcd Backups on a Schedule in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd and etcd snapshots
- Kubernetes CronJob
- Kubernetes PersistentVolumeClaim and Secret resources
- AWS CLI and S3-compatible object storage

## Sources Consulted
- Talos Linux disaster recovery documentation: https://www.talos.dev/latest/advanced/disaster-recovery/
- Talos Linux `talosctl etcd snapshot` CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Sidero Labs Talos API access from Kubernetes guide: https://docs.siderolabs.com/kubernetes-guides/advanced-guides/talos-api-access-from-k8s
- Talos RBAC role documentation for `os:etcd:backup`: https://www.talos.dev/v0.12/guides/rbac/
- Sidero Labs `talos-backup` README: https://github.com/siderolabs/talos-backup
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- etcd v3.5 snapshot documentation: https://etcd.io/docs/v3.5/tutorials/how-to-save-database/
- AWS CLI Docker image documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-docker.html
- AWS CLI S3 `cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The original Kubernetes CronJob examples mounted `/system/secrets/etcd` from the Talos host and used `etcdctl` with assumed certificate paths. This is not the supported Talos approach for in-cluster backups. Replaced those examples with `talosctl etcd snapshot` through Talos API access from Kubernetes and the narrower `os:etcd:backup` role.
- Method 2 claimed to back up to S3 but did not upload anything to S3. Changed it to a PersistentVolume-backed scheduled backup, which matches what the example actually does.
- Method 3 depended on the same unsupported direct `etcdctl` access pattern. Reworked it to use a `talosctl` init container for the snapshot and an AWS CLI container for the upload.
- The S3 example referenced a credential Secret after Method 2 was changed. Added the required Secret to the S3 manifest.
- The verification section used `etcdctl snapshot status`; current etcd v3.5 documentation uses `etcdutl snapshot status` for offline snapshot metadata. Updated the command.
- The post said zero values in snapshot status indicate corruption. That is too broad, especially for small or empty clusters. Changed the guidance to treat command errors as invalid snapshots.
- The restore language implied the snapshot alone is sufficient for any compatible cluster and that backups cover virtually any cluster failure. Clarified that Talos recovery also needs compatible configuration and secret material, and narrowed the recovery claim to control-plane state failures.

## Review Notes
- The examples use `ghcr.io/siderolabs/talosctl:v1.12.7` as a concrete image tag, but operators should match the image tag to their Talos Linux version.
- For production S3 retention, prefer bucket lifecycle policies or a dedicated Talos-aware backup tool such as `siderolabs/talos-backup`.
