# How to Back Up a vCluster Control Plane and Workload Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Backup, Velero, Disaster Recovery

Description: Pair a vCluster control-plane snapshot with a separate Velero or application-data backup instead of assuming PVC contents are included.

---

A vCluster snapshot and a workload-volume backup protect different state. In vCluster **0.36**, `vcluster snapshot create` captures the backing store, Helm release information, and saved vCluster configuration. The current stable documentation is explicit: it does **not** back up persistent volumes. Protect workload PVC contents with Velero, a storage-provider snapshot workflow, or an application-native backup.

This distinction also prevents a subtle recovery failure: restoring all Kubernetes objects can recreate a PVC declaration while leaving the data behind it absent or at an incompatible point in time.

## Inventory Every State Owner

Build a recovery inventory before choosing commands:

| State | Typical location | Protection method |
| --- | --- | --- |
| Kubernetes objects, RBAC, and CRDs in the tenant API | vCluster etcd or SQLite | `vcluster snapshot` |
| vCluster Helm release information and saved configuration | vCluster snapshot artifact | `vcluster snapshot` plus Git |
| Workload PVC contents | CSI or other persistent volumes | Velero CSI snapshot, Velero file-system backup, or provider tooling |
| External vCluster MySQL/PostgreSQL backing store | External database | Database-native backup |
| Application database logical state | Inside or outside Kubernetes | Application/database-native backup |
| Git-managed desired state | Git repository | Repository controls and backup |

If the vCluster control plane uses an external database outside its namespace, vCluster 0.36 instructs administrators to back it up and restore it with the database's supported procedure instead of the vCluster CLI snapshot commands.

## Create the Control-Plane Snapshot

Use an external backend for disaster recovery. For example, after authenticating the AWS CLI with a narrowly scoped identity:

```bash
aws sts get-caller-identity

vcluster snapshot create team-a \
  "s3://platform-backups/vcluster/team-a/control-plane-2026-08-21.tar.gz" \
  --server-side-encryption AES256
```

The CLI submits a snapshot request that the vCluster snapshot controller processes asynchronously. Check the status and rerun the command until it reports `Completed`:

```bash
vcluster snapshot get team-a \
  "s3://platform-backups/vcluster/team-a/control-plane-2026-08-21.tar.gz"
```

Do not add an older `--include-volumes` example to a v0.36 runbook. That workflow appears in older documentation but is not the current stable behavior. A `Completed` vCluster snapshot contains no workload PV data.

Avoid inline credentials in snapshot URLs. vCluster documents that such values are Base64-encoded rather than encrypted and can leak through shell history or logs. Prefer the normal credential chain or a supported Kubernetes Secret, and enforce bucket encryption, retention, immutability, and audit logging.

## Back Up Workload Volumes Separately with Velero

Install Velero server components and the provider plugin in the control plane cluster according to the official Velero documentation. Choose one data path per storage type:

- CSI snapshots without data movement when the CSI driver and `VolumeSnapshotClass` are configured and the durable provider snapshot remains accessible to the recovery cluster. If the volume bytes must be copied to backup object storage or recovered across providers, configure Velero CSI Snapshot Data Movement and use `--snapshot-move-data`.
- Velero file-system backup with the node agent for volumes mounted by Pods when snapshots are unavailable or not portable.
- Application-native exports for databases that require transaction-aware consistency.

For the default single-namespace shared-node layout, a host-level Velero backup can target the vCluster release namespace:

```bash
velero backup create team-a-host-namespace-2026-08-21 \
  --include-namespaces=team-a-vcluster

velero backup describe team-a-host-namespace-2026-08-21 --details
velero backup logs team-a-host-namespace-2026-08-21
```

This follows the current vCluster Velero guide, but it creates a whole-namespace backup rather than a volume-only artifact. It can include the vCluster workloads, configuration, control-plane state, and any control-plane PVC in that namespace. Confirm the output lists the expected PVCs and volume backup or snapshot actions; a `Completed` phase with unexpected exclusions is not a successful data backup.

If you use namespace synchronization, tenant workloads can be translated into several control plane namespaces. Include the release namespace and every mapped host namespace in the host-level backup. Backing up only the vCluster release namespace in that topology can omit application objects and volumes.

For file-system backup, configure the Velero node agent and use its documented opt-in annotations or `--default-volumes-to-fs-backup` policy. File-system backup only protects volumes mounted by Pods; use another method for unmounted PVCs. File-system backup and CSI snapshots have different performance, portability, and restore requirements; do not silently switch between them.

## Make the Data Application-Consistent

Storage snapshots are usually crash-consistent. A multi-volume database or an application with buffered writes may need more:

- a database-native logical or physical backup,
- pre-backup and post-backup hooks,
- filesystem freeze and thaw,
- a coordinated write pause,
- backup from a designated replica,
- matching recovery points across database, object storage, and queues.

Document the exact quiesce and resume procedure. Scaling a StatefulSet to zero can reduce writes, but it is not automatically a valid backup method for every database and creates downtime.

## Keep `vcluster.yaml` and Dependencies Outside the Snapshot

The snapshot contains saved configuration, but the vCluster restore documentation says that configuration is not automatically reapplied. Keep the reviewed `vcluster.yaml` in Git and include this in the recovery runbook:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

Also inventory external prerequisites that neither artifact can create reliably:

- compatible vCluster and Kubernetes versions,
- CSI drivers, StorageClasses, and VolumeSnapshotClasses,
- Gateway or Ingress controllers and DNS,
- cert-manager and other host operators,
- external databases, secrets, KMS keys, and cloud IAM roles.

## Test the Combined Restore

Run an isolated restore exercise on a schedule. Before restoring anything, establish a tested write fence that prevents tenant application Pods and controllers, CronJobs, queues, and external producers from running or writing. Keep it in place until all coordinated state is restored; disabling public routes alone is not sufficient. Choose the ordering based on the data artifact, and do not layer an unfiltered namespace-wide Velero restore over PVCs that the vCluster snapshot has already recreated. Velero skips existing resources by default, and its update policy does not restore data into an existing PVC. Only combine artifacts captured at a coordinated recovery point and tested as a pair: the host-level Velero artifact already contains control-plane state, so overlaying an unrelated vCluster snapshot can put Kubernetes objects and volume bytes at incompatible points in time.

1. Restore external host prerequisites, establish the write fence, and keep public routes disabled.
2. For a host-level Velero namespace artifact, restore it into an empty target with the same vCluster name, release namespace, and mapped-namespace topology so Velero can recreate its PVCs and volumes while the fence remains active.
3. After that Velero restore completes, use `vcluster restore` to apply the paired control-plane snapshot to the same vCluster release, then reapply the pinned `vcluster.yaml` while application workloads remain fenced.
4. If you instead use a provider or application backup designed to populate existing volumes, restore or create the vCluster control plane first and follow that tool's documented ordering while maintaining the same fence.
5. Restore external dependencies to a compatible point in time.
6. Release application workloads in a controlled order while keeping public routes, external producers, and scheduled writers disabled.
7. Confirm every expected PVC exists and becomes `Bound`, and confirm Pods attach and mount the restored volumes.
8. Run application consistency and data-integrity checks.
9. Remove the remaining write fence and enable public routes only after validation finishes.

For the host-level Velero path, run the basic restore before applying the vCluster snapshot and only against the clean target topology established in the runbook:

```bash
velero restore create team-a-restore-test \
  --from-backup team-a-host-namespace-2026-08-21

velero restore describe team-a-restore-test --details
velero restore logs team-a-restore-test
```

Namespace remapping can be difficult for vCluster because cluster-scoped bindings and volumes may contain namespace references. Test the exact destination topology rather than assuming a backup can be moved to any namespace. For a changed name, namespace, or topology, follow vCluster's documented create or migration restore workflow instead of this in-place sequence.

Calculate the effective recovery-point age from the oldest coordinated state component and measure the actual recovery duration through application validation-not merely until either tool reports completion-then verify both meet the documented recovery point and recovery time objectives.

## Official Documentation

- [vCluster: Create snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/backup)
- [vCluster: Restore snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/restore)
- [vCluster: Using Velero](https://www.vcluster.com/docs/vcluster/manage/backup-restore/velero)
- [Velero 1.18: CSI snapshot support](https://velero.io/docs/v1.18/csi/)
- [Velero 1.18: CSI snapshot data movement](https://velero.io/docs/v1.18/csi-snapshot-data-movement/)
- [Velero 1.18: File-system backup](https://velero.io/docs/v1.18/file-system-backup/)
- [Velero 1.18: Restore reference](https://velero.io/docs/v1.18/restore-reference/)

## Conclusion

In vCluster 0.36, a vCluster snapshot protects control-plane state but no persistent-volume contents. Pair it with an independently verified Velero, provider, or application-native data backup, keep `vcluster.yaml` in version control, and prove the combined ordering in an isolated restore. One green status cannot attest to state owned by another backup system.
