# How to Expand a PostgreSQL Operator PVC Safely—and What to Do When the StorageClass Cannot Resize

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, Storage, PVC

Description: Expand CloudNativePG storage through the Cluster resource, diagnose pending filesystem expansion, and replace replica volumes when resizing is unavailable.

Increasing a PostgreSQL volume has two possible paths: expand the existing PersistentVolumeClaim, or copy the database onto a larger volume. The StorageClass and CSI driver determine which is available. Editing the requested capacity does not guarantee that the mounted filesystem has grown.

The examples below use CloudNativePG 1.30. Other PostgreSQL operators have different storage APIs and replacement procedures; do not apply these Cluster fields to an unrelated operator. Start with CloudNativePG's [storage documentation](https://cloudnative-pg.io/docs/1.30/storage/).

## Identify the volume that is filling

Check the Cluster configuration, every associated claim, and the storage class:

```bash
kubectl get cluster app-db -n database -o yaml
kubectl get pvc -n database -l cnpg.io/cluster=app-db
kubectl get storageclass
kubectl get storageclass fast-ssd -o yaml
kubectl cnpg status app-db -n database --verbose
```

Distinguish data, WAL, and tablespace volumes. Increasing `.spec.storage.size` does not increase a separate `.spec.walStorage.size`. Map each PVC to its mounted path before deciding which capacity to change.

Also identify the cause of growth. Retained replication-slot WAL, failed archiving, and growing tables require different follow-up actions. Expansion buys capacity; it does not repair the process consuming it. Inspect the instance logs and PostgreSQL's [replication-slot statistics](https://www.postgresql.org/docs/18/view-pg-replication-slots.html) where WAL retention is involved. Never manually delete files from `pg_wal` to create temporary room.

Before replacing storage, confirm that another healthy copy exists and that a recent backup has been restored successfully. Record the current primary by querying the Cluster status rather than assuming instance `-1` is primary.

## Expand when the driver supports it

The StorageClass needs `allowVolumeExpansion: true`, and the actual driver must support the requested expansion. Kubernetes documents additional filesystem and driver requirements in [PVC expansion](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims).

Change the desired size in the Cluster's source manifest. This is a fragment to merge with the existing definition, preserving its other settings:

```yaml
spec:
  storage:
    storageClass: fast-ssd
    size: 200Gi
    resizeInUseVolumes: true
```

CloudNativePG propagates the request to the existing claims. If WAL uses a separate volume and also needs expansion, update that stanza separately:

```yaml
spec:
  walStorage:
    size: 50Gi
    resizeInUseVolumes: true
```

Observe progress on the affected claims:

```bash
kubectl get pvc -n database -l cnpg.io/cluster=app-db -w
kubectl describe pvc app-db-2 -n database
```

Compare `spec.resources.requests.storage` with `status.capacity.storage`, read conditions, and inspect events for controller or filesystem expansion failures. Then check free space inside the correct mounted filesystem. A larger cloud disk or PVC status is not sufficient evidence that PostgreSQL can use the new space.

For drivers that require a remount, CloudNativePG recommends restarting one replica at a time and waiting for it to recover. Preserve a healthy primary and sufficient replicas for the configured synchronous replication policy. Move the primary role to an expanded, caught-up replica before restarting the former primary. Connections to a primary undergoing switchover must reconnect, so measure the application impact.

Do not manually edit the PV's capacity to simulate success: Kubernetes warns that this can prevent the normal resize operation from occurring.

## When existing claims cannot grow

Setting `allowVolumeExpansion` cannot add an unsupported feature to the driver. A multi-instance CloudNativePG cluster can instead regenerate instances on new, larger claims. A single-instance cluster needs another healthy instance or a separate restore-and-cutover workflow before deleting any data-bearing claim.

Set the larger desired size and disable resizing of existing claims:

```yaml
spec:
  storage:
    size: 200Gi
    resizeInUseVolumes: false
```

If you are also replacing separate WAL storage, set its desired size and `resizeInUseVolumes: false` too. Verify available storage quota, schedulable nodes, and recovery throughput before beginning. The operator must provision and fully populate the replacement volume.

Select one confirmed standby. Inspect its role immediately before removal:

```bash
kubectl get cluster app-db -n database \
  -o jsonpath='{.status.currentPrimary}{"\n"}'
kubectl cnpg status app-db -n database --verbose
```

After proving instance 2 is a disposable standby and the remaining instances are healthy, the plugin can remove that instance and its PVCs:

```bash
# Destructive: only for the verified standby selected for replacement.
kubectl cnpg destroy app-db 2 -n database
```

The [destroy command](https://cloudnative-pg.io/docs/1.30/kubectl-plugin/#destroy) removes the instance's associated claims, including separate storage volumes. Inspect its help for the installed plugin version and verify the instance-to-volume mapping first. The operator can reuse the destroyed instance's serial number. Discover the replacement Pod and verify that it has new claims with the requested capacity instead of using its name as evidence that storage was replaced.

Wait until the replacement is ready, caught up, and using the larger filesystem before moving to another standby. Promote an expanded healthy replica using the documented [switchover command](https://cloudnative-pg.io/docs/1.30/kubectl-plugin/#promote), confirm the role change, then replace the former primary as a standby. Never delete every claim together.

## Verify the completed rollout

Compare requested capacity, claim capacity, mounted filesystem size, and free bytes across all instances. Check replication lag, write latency, archive health, and the source cause of growth. Re-enable in-use resizing only if the new storage supports it.

Record the expansion time and replacement recovery time separately. They determine how early a disk-space alert must fire: a migration that takes hours cannot safely start when only minutes of WAL capacity remain. Take a fresh backup after the storage change and retain the tested replacement procedure with the database's operational runbook.
