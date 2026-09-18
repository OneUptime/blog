# Fix CloudNativePG CrashLoopBackOff After Velero Restore: CRs, PVCs, and `PGDATA`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, Velero, Recovery, Persistent Volume

Description: Diagnose CloudNativePG crash loops after Velero restores by tracing custom resources, volume contents, PostgreSQL versions, and consistent backup recovery.

---

Velero can finish restoring Kubernetes resources while PostgreSQL repeatedly fails to start. Kubernetes objects, volume data, and a recoverable PostgreSQL backup are separate parts of the recovery. Diagnose which part is inconsistent before editing `PGDATA` or recreating the cluster.

The examples use CloudNativePG 1.30 and Velero's documented restore behavior. Check the versions and backup method used in your environment: a CSI snapshot, snapshot data movement, and File System Backup do not have identical restore paths or consistency properties.

## Preserve the evidence and classify the failure

Keep the restored application isolated from production traffic. Preserve the original backup and failed restore's logs before making changes:

```bash
velero restore describe orders-restore --details
velero restore logs orders-restore
velero backup describe orders-backup --details
kubectl get cluster orders -n database -o yaml
kubectl get pods,pvc -n database -l cnpg.io/cluster=orders
kubectl get events -n database --sort-by=.lastTimestamp
```

Use the names of your restore and backup. Inspect the failing pod and the previous PostgreSQL process:

```bash
kubectl describe pod orders-1 -n database
kubectl logs orders-1 -n database -c postgres --previous
```

If the failure occurs in an init container or plugin sidecar, discover the container names from the pod manifest and read that container's logs. “CrashLoopBackOff” is a retry state, not a diagnosis.

Classify the first error: missing mount, permission denied, incompatible database version, missing library, invalid checkpoint, missing WAL, or failure to contact a plugin. Follow that evidence instead of repeatedly deleting pods.

## Reconcile the restored control plane

Confirm the CloudNativePG operator, matching CRDs, admission webhooks, required backup plugins, and referenced Secrets exist. Verify that the restored Cluster specifies the intended PostgreSQL image, storage configuration, and bootstrap method.

Velero's [restore reference](https://velero.io/docs/main/restore-reference/) explains two important behaviors: existing resources are normally skipped, and resource status is normally removed before recreation. A successful restore can therefore leave you with an existing Cluster specification alongside newly restored resources. Inspect restore warnings and compare desired manifests with the backup inventory.

Do not assume `--existing-resource-policy=update` replaces volume contents. Velero documents that updating an existing PVC object does not restore or overwrite the underlying data. Similarly, blindly restoring old Cluster status is not a reliable way to tell the operator which instance should be primary.

Prefer restoring into an isolated destination with deliberate resource ownership. If a controller is creating empty PVCs before the intended data restore finishes, correct your staged recovery process; do not race the operator by repeatedly patching generated pods.

## Verify every required volume

A bound PVC confirms a binding to a PersistentVolume, not that the volume is attached, mounted, or contains the expected backup. Build a small inventory:

| Volume role | Evidence to check |
| --- | --- |
| PostgreSQL data | Correct claim, expected capacity, original backup or snapshot identity |
| Separate WAL | Corresponding WAL claim restored from the same protected backup set |
| Tablespaces | Every referenced tablespace present at its expected mount |
| Backup/plugin inputs | Required credentials, CA bundle, and archive source accessible |

Inspect each PVC's bound PV, StorageClass, CSI driver, and restore-related events. For snapshots, check `VolumeSnapshot` and `VolumeSnapshotContent` readiness and the provider's restored-volume status. A restored object that points to a snapshot inaccessible in the destination region is not a restored disk.

CloudNativePG's [volume snapshot backup documentation](https://cloudnative-pg.io/docs/1.30/appendixes/backup_volumesnapshot/) coordinates PostgreSQL backup behavior and the relevant storage volumes. Independently snapshotting `PGDATA` and a separate WAL volume at unrelated times can produce a set that cannot recover together.

## Inspect PGDATA without attempting repairs

If the container stays alive long enough, inspect the environment and metadata:

```bash
kubectl exec orders-1 -n database -c postgres -- sh -c \
  'printf "%s\n" "$PGDATA"; id; ls -ld "$PGDATA"; cat "$PGDATA/PG_VERSION"'
```

If it cannot stay running, use an isolated clone of the restored volume and a controlled diagnostic pod. Avoid attaching and mutating a live database volume from another writer.

Compare `PG_VERSION` with the Cluster's image major version. PostgreSQL physical files are not a major-upgrade interface. Restore using the compatible major version and required extension libraries before attempting a supported upgrade.

For permission failures, compare numeric ownership and mount options with the source deployment and the operator's [container image requirements](https://cloudnative-pg.io/docs/1.30/container_images/). Do not apply recursive `chmod 777` or an arbitrary UID. Verify the mount path first; an empty directory at the expected location may indicate the wrong volume or subdirectory rather than lost data.

## Choose a supported recovery source

Velero [File System Backup](https://velero.io/docs/v1.17/file-system-backup/) reads a live filesystem over time. Without a database-consistent procedure, copying a running PostgreSQL directory does not create the same artifact as a PostgreSQL base backup. A missing checkpoint or required WAL may reflect inconsistent backup data, not a pod configuration problem.

When a verified Barman backup and WAL archive exist, bootstrap a new CloudNativePG Cluster using the documented [recovery workflow](https://cloudnative-pg.io/docs/1.30/recovery/). For valid operator-coordinated snapshots, use the supported snapshot recovery configuration, including separate WAL and tablespace storage where applicable.

Do not remove `backup_label`, delete WAL, or run `pg_resetwal` to make a questionable copy start. Those actions can hide the recovery failure while discarding consistency guarantees. Preserve the failed copy and recover from a known-good source.

## Verify the restored database before cutover

Confirm recovery completes, application tables and extensions are present, and representative business records match the intended recovery point. Test writes through the destination's own Service, then rebuild replicas and establish a new backup schedule.

Only route production traffic after the destination has passed these checks. Retain a record of which Kubernetes metadata and which database backup supplied the recovery; that distinction makes the next restore repeatable.
