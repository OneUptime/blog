# Validation Summary: How to Configure Persistent Storage for Databases in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Longhorn
- StorageClass
- PersistentVolumeClaim
- StatefulSet
- MySQL
- Helm
- kubectl
- jq
- rancher/local-path-provisioner

## Sources Consulted
- Rancher Longhorn integration overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/longhorn
- Longhorn installation requirements: https://longhorn.io/docs/latest/deploy/install/
- Longhorn storage class parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn volume creation with Kubernetes: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/create-volumes/
- Longhorn recurring snapshots and backups: https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn backup target configuration: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn node space usage: https://longhorn.io/docs/latest/nodes-and-volumes/nodes/node-space-usage/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes PersistentVolume access modes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes sysctl guidance: https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- MySQL binary log reference: https://dev.mysql.com/doc/mysql/en/binary-log.html
- rancher/local-path-provisioner README: https://github.com/rancher/local-path-provisioner

## Issues Found
- The post described Longhorn as Rancher's own storage solution and omitted important Longhorn node prerequisites. I corrected the introduction wording and added the missing prerequisite note for Longhorn installation requirements, plus `jq`, which is used later in the commands.
- The Helm install example mixed installation with an incomplete S3 backup-target example. I removed the inline backup-target flag so the install step remains correct on its own, and kept backup-target setup in the backup section where Longhorn documents it.
- The PVC example used an undocumented `backup.longhorn.io/backup-schedule` annotation. I removed that annotation because Longhorn documents recurring backups through recurring jobs and recurring-job labels, not that PVC annotation.
- The StatefulSet example was internally inconsistent: it created standalone PVCs, then ignored them in favor of `volumeClaimTemplates`; it set `replicas: 3` for a plain `mysql:8.0` container with no replication configuration; it omitted the required headless Service; and it mounted a separate binlog volume without configuring MySQL to write binlogs there. I changed the example to a headless Service plus a single-replica StatefulSet that mounts the named PVCs directly and sets `--log-bin=/var/lib/mysql-binlog/mysql-bin`.
- The post included in-pod THP and sysctl tuning that is not a safe generic workload manifest pattern. Kubernetes documents node-level sysctls separately, so I removed those blocks rather than leaving a misleading example.
- The Longhorn backup-group example used `kubectl annotate` on a PVC, but Longhorn documents recurring-job assignment via labels and requires `recurring-job.longhorn.io/source=enabled` when syncing from PVCs. I replaced the command with the documented PVC labels.
- The monitoring section had two accuracy problems: the first command reported requested PVC size rather than usage, and the node command queried a nonexistent `.status.allocatable.storage` field. I corrected the wording on the PVC command and replaced the node example with a Longhorn node CR query that uses documented disk-status fields.
- The best-practices note said MySQL/MariaDB should use WAL archiving, which is PostgreSQL terminology. I corrected this to binary logging for point-in-time recovery.

## Review Notes
- `kubectl` was not installed in the local workspace, so CLI syntax was validated against the official Kubernetes and Longhorn documentation rather than local `--help` output.
- The post keeps `ReadWriteOnce` in the examples for broad compatibility, but Kubernetes and Longhorn both document `ReadWriteOncePod` as the stricter single-writer mode for CSI-backed volumes when that isolation is desired.
