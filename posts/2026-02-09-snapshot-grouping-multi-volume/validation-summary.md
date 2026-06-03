# Validation Summary: How to Configure Volume Snapshot Grouping for Multi-Volume Consistency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Jobs and CronJobs
- Kubernetes CSI VolumeSnapshot API
- Kubernetes PersistentVolumeClaim restore from VolumeSnapshot
- kubectl
- Bash
- jq
- PostgreSQL 15 backup control functions

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes CSI VolumeSnapshot API reference: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- Kubernetes CSI Volume Group Snapshot documentation: https://kubernetes-csi.github.io/docs/group-snapshot-restore-feature.html
- Kubernetes v1.36 Volume Group Snapshot GA announcement: https://kubernetes.io/blog/2026/05/08/kubernetes-v1-36-volume-group-snapshot-ga/
- PostgreSQL 15 backup control functions: https://www.postgresql.org/docs/15/functions-admin.html
- PostgreSQL 15 release notes: https://www.postgresql.org/docs/15/release-15.html
- PostgreSQL current continuous archiving and low-level backup API documentation: https://www.postgresql.org/docs/current/continuous-archiving.html

## Issues Found
- Label-based grouping was described too strongly as if it could ensure same-point-in-time or atomic multi-volume snapshots. Updated the language to clarify that labels only organize individual `VolumeSnapshot` objects and that atomic group snapshots require CSI `VolumeGroupSnapshot` support from the cluster and CSI driver.
- The PostgreSQL example used `pg_start_backup` and `pg_stop_backup` with a `postgres:15` image. PostgreSQL 15 renamed these functions to `pg_backup_start` and `pg_backup_stop` and removed exclusive backup mode. Updated the example to use the PostgreSQL 15 function names.
- The PostgreSQL backup example opened separate `psql` sessions for start and stop. PostgreSQL's low-level backup API requires the connection that starts backup mode to stay open until backup mode ends. Updated the snippet to run snapshot creation through a `psql` shell escape inside the same session.
- The PostgreSQL example used `jq` later but did not install it in the `postgres:15` container. Added `jq` and `ca-certificates` to the package install command.
- The PostgreSQL example discarded the metadata returned by `pg_backup_stop`. Updated the snippet to capture the output and store it in a ConfigMap associated with the snapshot group.
- The restore script accepted a target namespace while reading snapshots from the current namespace. A PVC using `spec.dataSource` references a `VolumeSnapshot` in the same namespace unless cross-namespace data sources are explicitly used. Updated the script to use a single namespace for both snapshots and restored PVCs.
- Snapshot wait loops could report success if both total and ready counts were zero. Added a `TOTAL > 0` guard before considering a group complete.
- Cleanup could include snapshots with no `snapshot-group` label and produce an invalid group value. Updated the jq filter to ignore missing labels.

## Review Notes
- The examples assume the cluster has the CSI snapshot CRDs, snapshot controller, a compatible CSI driver, appropriate RBAC for `snapshot-creator`, and an existing `VolumeSnapshotClass` named `csi-snapshot-class`.
- The label-based examples provide grouping and monitoring for individual snapshots, not true atomic multi-volume crash consistency. For true storage-level group snapshots, use the `groupsnapshot.storage.k8s.io` API when available.
- PostgreSQL backup-mode examples also assume WAL archiving and restore procedures are handled correctly outside this snippet.
