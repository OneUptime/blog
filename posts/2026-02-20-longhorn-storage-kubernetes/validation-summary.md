# Validation Summary: How to Use Longhorn for Distributed Block Storage on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Helm
- kubectl
- PersistentVolumeClaims and StorageClasses
- Longhorn RecurringJob and Volume custom resources
- NGINX Ingress basic authentication
- S3-compatible backup targets

## Sources Consulted
- Longhorn 1.6.0 Installation Requirements: https://longhorn.io/docs/archives/1.6.0/deploy/install/
- Longhorn 1.6.0 Install with Helm: https://longhorn.io/docs/archives/1.6.0/deploy/install/install-with-helm/
- Longhorn 1.6.0 Install with kubectl: https://longhorn.io/docs/archives/1.6.0/deploy/install/install-with-kubectl/
- Longhorn 1.6.0 StorageClass Parameters: https://longhorn.io/docs/archives/1.6.0/references/storage-class-parameters/
- Longhorn 1.6.0 Recurring Snapshots and Backups: https://longhorn.io/docs/archives/1.6.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn 1.6.0 Setting a Backup Target: https://longhorn.io/docs/archives/1.6.0/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn Disaster Recovery Volumes: https://longhorn.io/docs/latest/snapshots-and-backups/setup-disaster-recovery-volumes/
- Longhorn Node Maintenance Guide: https://longhorn.io/docs/latest/maintenance/maintenance/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The RHEL/CentOS iSCSI prerequisite omitted the Longhorn-documented `--setopt=tsflags=noscripts` install option and initiator name setup. Updated the command block so `iscsi-initiator-utils` is installed and configured as Longhorn documents.
- The database StorageClass used `dataLocality: "strict-local"` with `numberOfReplicas: "3"`. Longhorn requires `strict-local` volumes to have exactly one replica, so the replica count was changed to `"1"` and the comment was updated.
- The PVC example claimed "Block storage is RWO", which was too broad because Longhorn also supports RWX through its share-manager path. Reworded the comment to describe the example's typical block-volume access mode.
- The DR example used a normal PVC annotation for `longhorn.io/from-backup`, which is not the documented way to create a Longhorn standby DR volume. Replaced it with a Longhorn `Volume` custom resource using `spec.fromBackup` and `Standby: true`.
- The node maintenance section said `kubectl drain` drains Longhorn replicas and that Longhorn automatically rebalances replicas afterward. Updated the wording to match Longhorn's documented behavior: drain moves workloads, Longhorn handles engines and replicas according to the Node Drain Policy, and uncordon re-enables scheduling.

## Review Notes
- The post uses Longhorn v1.6.0 URLs for the environment check and kubectl installation examples. Those links are valid for the version shown, but Longhorn has newer releases; future updates should consider moving the commands to the current Longhorn installation flow.
