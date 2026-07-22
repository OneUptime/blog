# How to Restore a Kubernetes PVC from a CSI VolumeSnapshot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Volume Snapshots, PersistentVolumeClaim, Disaster Recovery

Description: Restore a ready CSI VolumeSnapshot into a new PVC and verify the recovered data before workload cutover.

---

Kubernetes restores a CSI snapshot by dynamically provisioning a new PersistentVolumeClaim. The new PVC names the `VolumeSnapshot` as its `dataSource`; the external provisioner passes the bound backend snapshot handle to the CSI driver's `CreateVolume` call.

It does not overwrite the source PVC. That new-volume behavior gives you a chance to mount, inspect, and validate the recovery before changing a production workload.

## Verify the snapshot before restoring

Check the namespaced snapshot:

```bash
NAMESPACE=app
SNAPSHOT_NAME=app-data-before-upgrade

kubectl get volumesnapshot "$SNAPSHOT_NAME" \
  --namespace "$NAMESPACE" \
  -o yaml
```

Do not proceed until `status.readyToUse` is `true`:

```bash
kubectl wait \
  --for=jsonpath='{.status.readyToUse}'=true \
  "volumesnapshot/${SNAPSHOT_NAME}" \
  --namespace "$NAMESPACE" \
  --timeout=15m
```

Record its minimum restore capacity and content:

```bash
kubectl get volumesnapshot "$SNAPSHOT_NAME" \
  --namespace "$NAMESPACE" \
  -o jsonpath='content={.status.boundVolumeSnapshotContentName}{"\n"}restoreSize={.status.restoreSize}{"\n"}created={.status.creationTime}{"\n"}'
```

If `restoreSize` is present, the new PVC must not request less. If it is absent, size is unknown; use the original claim's capacity or a larger vendor-supported value. A larger request works only if the driver can create or expand the restored volume as documented.

Also verify that the snapshot represents the intended application recovery point. `readyToUse` describes storage readiness, not database consistency or data correctness.

## Select a compatible target StorageClass

Find the snapshot content's driver:

```bash
CONTENT_NAME=$(kubectl get volumesnapshot "$SNAPSHOT_NAME" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

SNAPSHOT_DRIVER=$(kubectl get volumesnapshotcontent "$CONTENT_NAME" \
  -o jsonpath='{.spec.driver}')

printf '%s\n' "$SNAPSHOT_DRIVER"
```

List StorageClasses and their provisioners:

```bash
kubectl get storageclass \
  -o custom-columns='NAME:.metadata.name,PROVISIONER:.provisioner,BINDING:.volumeBindingMode,EXPANSION:.allowVolumeExpansion'
```

Choose a StorageClass supported by the CSI vendor for restore from that snapshot. Its `provisioner` normally needs to be the same driver. It does not have to be the original StorageClass if the driver explicitly supports the alternative parameters, tier, topology, and encryption policy.

Use the source PVC as a safe baseline for access and volume modes:

```bash
kubectl get pvc app-data --namespace "$NAMESPACE" \
  -o jsonpath='class={.spec.storageClassName}{"\n"}access={.spec.accessModes}{"\n"}mode={.spec.volumeMode}{"\n"}capacity={.status.capacity.storage}{"\n"}'
```

Keep `Filesystem` or `Block` consistent. Current snapshot components prevent unauthorized volume-mode conversion unless an administrator explicitly allows it on the `VolumeSnapshotContent`. A mode conversion should be an exceptional, security-reviewed operation, not a troubleshooting shortcut.

## Create the restored PVC

This example restores a filesystem snapshot into a 100 GiB claim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data-restored
  namespace: app
  labels:
    recovery.oneuptime.com/source-snapshot: app-data-before-upgrade
spec:
  storageClassName: production-block
  dataSource:
    name: app-data-before-upgrade
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 100Gi
```

Change the namespace, names, class, modes, and size to match your environment. The ordinary `dataSource` reference is namespaced, so the PVC and `VolumeSnapshot` must be in the same namespace.

Cross-namespace storage data sources are a separate feature that requires `dataSourceRef`, feature gates, compatible external-provisioner configuration, and a `ReferenceGrant`. Do not add a namespace field to the ordinary example and assume access is granted.

Apply and watch the claim:

```bash
kubectl apply -f restored-pvc.yaml
kubectl get pvc app-data-restored --namespace app --watch
```

With `volumeBindingMode: Immediate`, provisioning normally begins at once. With `WaitForFirstConsumer`, the PVC can remain `Pending` until a Pod references it, allowing the scheduler and provisioner to choose compatible topology.

## Mount the restore in an isolated validation Pod

For a `WaitForFirstConsumer` class, or to inspect the recovered filesystem, create a disposable Pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: inspect-app-restore
  namespace: app
spec:
  restartPolicy: Never
  containers:
    - name: inspector
      image: busybox:1.36
      command: ["sh", "-c", "sleep 3600"]
      volumeMounts:
        - name: restored-data
          mountPath: /restore
          readOnly: true
  volumes:
    - name: restored-data
      persistentVolumeClaim:
        claimName: app-data-restored
        readOnly: true
```

```bash
kubectl apply -f inspect-restore.yaml
kubectl wait --for=condition=Ready pod/inspect-app-restore \
  --namespace app \
  --timeout=5m
kubectl exec --namespace app inspect-app-restore -- ls -la /restore
```

Read-only mounting reduces accidental changes, but the access mode and CSI driver must support the requested behavior. A raw block restore needs `volumeDevices` rather than `volumeMounts`, and inspection tools appropriate for the block format.

Do not limit validation to `ls`. Check application-level invariants: database recovery logs, schema version, manifest checksums, expected record counts, object references, permissions, and the timestamp of the recovered state. Prefer running the application in an isolated network context so it cannot send production messages or join a live database cluster while being tested.

## Cut over the workload safely

Plan for writes made after the snapshot. A storage restore reverts to the snapshot's point in time; it does not merge later changes. Archive transaction logs, event streams, or other deltas needed to reach the desired recovery point.

For a workload that directly names a PVC:

1. Stop or quiesce writers.
2. Take a final protective snapshot or backup of the current PVC if possible.
3. Complete validation of the restored claim.
4. Update the workload manifest so its volume's `claimName` is `app-data-restored`.
5. Roll out one controlled instance and verify startup, reads, writes, metrics, and logs.
6. Resume traffic only after application health checks pass.
7. Keep the original PVC and recovery snapshot until the rollback window expires.

Respect `ReadWriteOnce` and `ReadWriteOncePod`: detach the old consumer before scheduling a new writer. Do not force-delete Pods to bypass attachment protection.

StatefulSets created from `volumeClaimTemplates` expect an ordinal-specific PVC name. Changing a template does not transparently remap an existing replica. Restore the required claim under its exact StatefulSet identity using a maintenance procedure, rather than patching the Pod.

## Diagnose a restored PVC that stays Pending

Start with events:

```bash
kubectl describe pvc app-data-restored --namespace app
kubectl get events --namespace app \
  --field-selector involvedObject.name=app-data-restored \
  --sort-by=.lastTimestamp
```

Common causes include:

- the snapshot is not `readyToUse`;
- the snapshot is in another namespace;
- requested storage is below `restoreSize`;
- the target StorageClass uses a different or incompatible driver;
- `volumeMode` differs from the source;
- `WaitForFirstConsumer` has no consuming Pod;
- no allowed topology has capacity;
- the external-provisioner or CSI controller is unhealthy; or
- backend credentials, encryption keys, quotas, or snapshot permissions are missing.

Inspect logs from the CSI external-provisioner and driver controller after reading events. Do not remove the `dataSource` from a failed claim and reuse it as an empty PVC; delete only the failed new claim after confirming what the provisioner created, then correct the manifest and create a fresh restore request.

## Clean up with retention in mind

Delete the inspection Pod when validation ends. Before deleting the restored PVC, inspect its bound PV's reclaim policy: `Delete` can remove the newly provisioned backend volume, while `Retain` leaves administrator cleanup.

Before deleting the `VolumeSnapshot`, inspect its content's `deletionPolicy`. `Delete` can remove the physical recovery point. Preserve the original volume, restored volume, and snapshot until the recovery is accepted and your retention policy permits cleanup.

## Official Documentation

- [Kubernetes Persistent Volumes: restore from a snapshot](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-snapshot-and-restore-volume-from-snapshot-support)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI PVC data sources](https://kubernetes-csi.github.io/docs/volume-datasources.html)
- [Kubernetes CSI external-provisioner snapshot data source](https://kubernetes-csi.github.io/docs/external-provisioner.html#snapshot)
- [Kubernetes CSI cross-namespace data sources](https://kubernetes-csi.github.io/docs/cross-namespace-data-sources.html)
- [Kubernetes CSI volume-mode conversion protection](https://kubernetes-csi.github.io/docs/prevent-volume-mode-conversion.html)
