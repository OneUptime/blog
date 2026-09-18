# Validation Summary: Fix CloudNativePG CrashLoopBackOff After Velero Restore: CRs, PVCs, and `PGDATA`

## Status
validated

## Post Type
Technical troubleshooting and recovery guide with shell commands.

## Technologies Covered
- CloudNativePG 1.30 and its Cluster custom resource, operator, and backup plugins
- PostgreSQL physical backups, WAL, PGDATA, tablespaces, and major-version compatibility
- Kubernetes pods, PVCs, PVs, CSI snapshots, and kubectl
- Velero restore policies, File System Backup, and snapshot restore methods
- Barman Cloud backup and recovery

## Sources Consulted
- [CloudNativePG 1.30 snapshot backups](https://cloudnative-pg.io/docs/1.30/appendixes/backup_volumesnapshot/) — coordinated hot/cold backups and storage volumes.
- [CloudNativePG 1.30 recovery](https://cloudnative-pg.io/docs/1.30/recovery/) — new-cluster bootstrap, Barman Cloud Plugin, snapshot recovery, and WAL requirements.
- [CloudNativePG 1.30 container image requirements](https://cloudnative-pg.io/docs/1.30/container_images/) — compatible PostgreSQL images and major-version detection.
- [CloudNativePG 1.30 troubleshooting](https://cloudnative-pg.io/docs/1.30/troubleshooting/) — pod logs, previous-container logs, and the postgres container.
- [CloudNativePG 1.30 labels and annotations](https://cloudnative-pg.io/docs/1.30/labels_annotations/) — cnpg.io/cluster selector.
- [CloudNativePG 1.30 tablespaces](https://cloudnative-pg.io/docs/1.30/tablespaces/) — snapshot support and recovery storage requirements.
- [CloudNativePG 1.30 security](https://cloudnative-pg.io/docs/1.30/security/) — operator ownership and pod/container security contexts.
- [Velero restore reference](https://velero.io/docs/main/restore-reference/) — skipped existing resources, status removal, and limits of the update policy.
- [Velero 1.17 File System Backup](https://velero.io/docs/v1.17/file-system-backup/) — live-filesystem copying and consistency limitations.
- [Velero 1.17 restore describe implementation](https://github.com/vmware-tanzu/velero/blob/v1.17.0/pkg/cmd/cli/restore/describe.go), [restore logs implementation](https://github.com/vmware-tanzu/velero/blob/v1.17.0/pkg/cmd/cli/restore/logs.go), and [backup describe implementation](https://github.com/vmware-tanzu/velero/blob/v1.17.0/pkg/cmd/cli/backup/describe.go) — command arguments and --details support, checked through the official raw source files.
- [Kubernetes persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) — binding versus mounting and volume lifecycle.
- [Kubernetes volume snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/) — snapshot resources and CSI responsibilities.
- [Kubernetes pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) — CrashLoopBackOff and restart backoff.
- Kubernetes command references: [get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), [logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and [exec](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/).
- [PostgreSQL filesystem backups](https://www.postgresql.org/docs/current/backup-file.html) — consistency and coordinated multi-volume snapshots.
- [PostgreSQL continuous archiving](https://www.postgresql.org/docs/current/continuous-archiving.html) — WAL and backup_label requirements.
- [PostgreSQL upgrades](https://www.postgresql.org/docs/current/upgrading.html) — physical-format compatibility across major versions.
- [PostgreSQL database file layout](https://www.postgresql.org/docs/current/storage-file-layout.html) — PG_VERSION metadata.
- [PostgreSQL pg_resetwal](https://www.postgresql.org/docs/current/app-pgresetwal.html) — potential inconsistency following forced WAL reset.

## Issues Found
- **PVC binding was incorrectly described as proof of attachment.** Replaced “A bound PVC proves a volume was attached” with a statement that binding confirms the PVC-to-PV association but does not establish attachment, mounting, or backup contents. Kubernetes documents binding and pod volume use as separate steps. No commands or other article content needed changes.

## Review Notes
- Reviewed every shell block: Velero describe/logs commands and --details, kubectl resource selection, namespace and container flags, YAML output, event sorting, previous-container logs, and exec argument separation are valid. Shell syntax checks passed for all three Bash blocks and the inner diagnostic shell command.
- The examples assume the named resources exist, matching CRDs are installed, access is authorized, and the postgres image contains the diagnostic shell/utilities. --previous requires a previous terminated container instance; exec requires a running container. No live Kubernetes cluster or restore was exercised.
- Confirmed the linked technical documentation and author URL are reachable. Some browser fetches failed; direct HTTPS retrieval successfully verified the affected CloudNativePG pages. Velero CLI syntax was verified against tagged official source rather than unavailable generated CLI pages.
- CloudNativePG 1.30 recovery bootstraps a new cluster. Its recommended object-store workflow uses the Barman Cloud Plugin and compatible backups produced by CloudNativePG; native Barman Cloud integration has been deprecated since 1.26. The post links to the supported workflow without prescribing deprecated configuration.
- Separate WAL and tablespace volumes must be included in recovery. Snapshot consistency depends on PostgreSQL backup coordination and the storage driver. PVC or snapshot resource presence alone does not establish database recoverability.
- The recommendations to preserve evidence, avoid arbitrary permission changes or destructive WAL manipulation, and validate the destination before cutover are technically sound.
- The Velero restore-reference link tracks main; the File System Backup reference and CLI source checks are pinned to 1.17. PostgreSQL current documentation resolved to version 18 during review. These links should be rechecked when updating the article for other versions.
