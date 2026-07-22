# Troubleshooting a VolumeSnapshot Stuck at readyToUse: false

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Volume Snapshots, Troubleshooting, Persistent Storage

Description: Trace a VolumeSnapshot that never becomes ready across the snapshot controller, CSI sidecar, driver, and storage backend.

---

`status.readyToUse: false` means the snapshot is not currently ready to restore. For a dynamically created snapshot that has reached the CSI driver, readiness originates in the driver's `CreateSnapshot` response and is propagated from `VolumeSnapshotContent` to `VolumeSnapshot`. The common controller can also set `VolumeSnapshot.status.readyToUse` to false when it reports controller-side errors. It is not a field an operator should patch to unblock a restore.

Troubleshooting becomes much faster when you locate the last completed stage in the control path:

```text
VolumeSnapshot
  -> common snapshot controller
  -> VolumeSnapshotContent
  -> driver-specific csi-snapshotter sidecar
  -> CSI CreateSnapshot/ListSnapshots RPC
  -> storage backend
```

## Capture the request, status, and events

Set the names and inspect the full object:

```bash
NAMESPACE=app
SNAPSHOT_NAME=app-data-snapshot

kubectl get volumesnapshot "$SNAPSHOT_NAME" \
  --namespace "$NAMESPACE" \
  -o yaml

kubectl describe volumesnapshot "$SNAPSHOT_NAME" \
  --namespace "$NAMESPACE"
```

Pay attention to:

- `spec.source` and `spec.volumeSnapshotClassName`;
- `status.boundVolumeSnapshotContentName`;
- `status.readyToUse`;
- `status.creationTime` and `status.restoreSize`;
- `status.error.message` and `status.error.time`; and
- warning events at the bottom of `describe`.

There are three distinct states:

- `readyToUse: true`: the driver says the snapshot is ready for restore.
- `readyToUse: false`: the driver or controller explicitly reports not ready.
- field absent: readiness is unknown or status has not propagated yet.

The snapshot controller retries creation failures and clears the error after success, so capture the latest error and controller logs before restarting components.

## Find the last completed stage

Use `boundVolumeSnapshotContentName`:

```bash
CONTENT_NAME=$(kubectl get volumesnapshot "$SNAPSHOT_NAME" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

printf '%s\n' "$CONTENT_NAME"
```

### No content name

For a dynamically provisioned snapshot, if the value is empty, the common snapshot controller has not completed binding. Focus on:

- whether the source PVC exists in the same namespace and is `Bound`;
- whether the requested `VolumeSnapshotClass` exists;
- whether exactly one matching default exists when the request omits a class;
- class-to-PV driver mismatch;
- invalid or old API fields rejected by the CRD;
- common controller health and RBAC; and
- events on the `VolumeSnapshot`.

At this stage, the CSI driver may not have received any request.

### Content exists, but no snapshot handle

Inspect it:

```bash
kubectl get volumesnapshotcontent "$CONTENT_NAME" -o yaml
kubectl describe volumesnapshotcontent "$CONTENT_NAME"
```

If `status.snapshotHandle` is absent, dynamic creation has not successfully returned a backend snapshot ID. Focus on the external-snapshotter sidecar, CSI socket, driver capability, credentials, and `CreateSnapshot` errors.

### Handle exists, but readiness remains false

When `VolumeSnapshotContent.status.snapshotHandle` is present and that content's `status.readyToUse` is false, the driver knows a backend snapshot but says it is still unusable. Check the backend job and driver logs. Large snapshots may be asynchronous, but indefinite waiting can indicate quota, replication, encryption, or backend health failures.

Do not assume that a handle proves completion. The CSI response has a separate `ready_to_use` field for that reason.

## Verify source PVC, PV, and class alignment

For a dynamically provisioned snapshot, resolve the source:

```bash
PVC_NAME=$(kubectl get volumesnapshot "$SNAPSHOT_NAME" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.source.persistentVolumeClaimName}')

kubectl get pvc "$PVC_NAME" --namespace "$NAMESPACE" -o wide

PV_NAME=$(kubectl get pvc "$PVC_NAME" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.volumeName}')

PV_DRIVER=$(kubectl get pv "$PV_NAME" \
  -o jsonpath='{.spec.csi.driver}')

printf '%s\n' "$PV_DRIVER"
```

Resolve the selected class:

```bash
SNAPSHOT_CLASS=$(kubectl get volumesnapshot "$SNAPSHOT_NAME" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.volumeSnapshotClassName}')

printf '%s\n' "$SNAPSHOT_CLASS"
```

If the value is empty, the common controller has not selected a default class yet; return to the default-class and controller checks above. Otherwise, resolve its driver:

```bash
kubectl get volumesnapshotclass "$SNAPSHOT_CLASS" \
  -o jsonpath='{.driver}{"\n"}'
```

The two driver names must match exactly. Also compare `.spec.driver` on the content. Check the vendor's documentation for support of the source volume type, online snapshots, topology, and the installed driver version.

If the PVC was created in the same manifest moments before the snapshot, it may not have been bound when first reconciled. Wait until the claim is stably `Bound`; current snapshot controllers retry this error. Recreate the snapshot only if the immutable source PVC name is wrong.

## Check the common snapshot controller

Locate it because the namespace can vary by distribution:

```bash
kubectl get deployment --all-namespaces | grep snapshot-controller
```

For the upstream Deployment installed in `kube-system`:

```bash
kubectl get pods --namespace kube-system \
  --selector=app.kubernetes.io/name=snapshot-controller

kubectl logs deployment/snapshot-controller \
  --namespace kube-system \
  --all-pods=true \
  --all-containers=true \
  --since=30m
```

Search for the snapshot, content, PVC, or PV name. Look for authorization failures, missing CRDs, conflicting defaults, failed binding, update conflicts, and version-skew errors.

Check the CRDs are established and serve `v1`:

```bash
kubectl wait --for=condition=Established \
  crd/volumesnapshots.snapshot.storage.k8s.io \
  crd/volumesnapshotcontents.snapshot.storage.k8s.io \
  crd/volumesnapshotclasses.snapshot.storage.k8s.io \
  --timeout=30s

kubectl get crd \
  volumesnapshots.snapshot.storage.k8s.io \
  volumesnapshotcontents.snapshot.storage.k8s.io \
  volumesnapshotclasses.snapshot.storage.k8s.io \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.versions[*]}{.name}{" served="}{.served}{" "}{end}{"\n"}{end}'
```

Use a snapshot-controller release compatible with the installed CRDs and Kubernetes version. Do not combine current controllers with copied legacy `v1beta1` manifests.

## Check the driver-specific snapshotter and CSI driver

The common controller does not call storage. The `csi-snapshotter` sidecar normally runs beside the CSI controller and watches content objects whose `spec.driver` matches its driver. Drivers using distributed snapshotting instead run the sidecar on each node.

Find the vendor controller workload and list its containers. The example assumes a Deployment; use `statefulset` or `daemonset` as the resource type when applicable:

```bash
kubectl get deployment,statefulset,daemonset --all-namespaces

kubectl get deployment DRIVER_CONTROLLER \
  --namespace DRIVER_NAMESPACE \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"\t"}{.image}{"\n"}{end}'
```

Read both containers from the same Pod:

```bash
kubectl logs pod/DRIVER_CONTROLLER_POD \
  --namespace DRIVER_NAMESPACE \
  --container csi-snapshotter \
  --since=30m

kubectl logs pod/DRIVER_CONTROLLER_POD \
  --namespace DRIVER_NAMESPACE \
  --container DRIVER_CONTAINER \
  --since=30m
```

Common messages identify:

- `CREATE_DELETE_SNAPSHOT` not supported;
- CSI socket connection or identity failure;
- `DeadlineExceeded` during `CreateSnapshot` or readiness polling;
- `PermissionDenied` or missing secret;
- source volume handle not found;
- backend snapshot already exists with incompatible attributes;
- quota or rate limits; and
- a backend snapshot that remains in a creating, pending, or failed state.

The sidecar retries failed operations with exponential backoff. Increasing its CSI RPC timeout can be appropriate when a healthy vendor operation legitimately exceeds the configured timeout, but it does not fix permission, capability, quota, or backend failures. Change flags only through the driver's supported deployment and compatibility guidance.

## Validate snapshot credentials and RBAC

Inspect the class parameters:

```bash
kubectl get volumesnapshotclass "$SNAPSHOT_CLASS" -o yaml
```

If it contains `csi.storage.k8s.io/snapshotter-secret-name` and `csi.storage.k8s.io/snapshotter-secret-namespace`, confirm the Secret exists and the driver sidecar's service account can read it. Do not print secret data into incident logs.

The two parameter keys form a pair and may contain external-snapshotter-supported templates. A typo or unresolved namespace makes creation fail. Deletion behavior is slightly different: the external-snapshotter can continue a delete request when the Secret is absent, but a driver that requires those credentials can leave manual backend cleanup.

For common controller authorization, use targeted checks with its actual service account:

```bash
kubectl auth can-i get volumesnapshots.snapshot.storage.k8s.io \
  --as=system:serviceaccount:kube-system:snapshot-controller \
  --all-namespaces

kubectl auth can-i update volumesnapshotcontents.snapshot.storage.k8s.io \
  --as=system:serviceaccount:kube-system:snapshot-controller
```

Do not solve a single denied verb by granting `cluster-admin`. Compare RBAC with the manifest from the exact external-snapshotter release.

## Inspect the backend without changing it

Use the content's `status.snapshotHandle` or driver logs to find the operation in the storage system. Check:

- creation state and failure reason;
- source volume existence and health;
- available snapshot quota and API rate limits;
- region, zone, pool, or cluster alignment;
- encryption key access;
- replication or copy progress;
- concurrent snapshot limits; and
- service incidents.

Some drivers support online snapshots; others impose attachment or application quiescing requirements. Follow the vendor's current documentation. Do not delete a backend snapshot manually while Kubernetes still owns a content object unless the vendor's recovery procedure explicitly coordinates both sides.

## Handle static imports carefully

For pre-provisioned content, verify that `spec.source.snapshotHandle` is the exact CSI snapshot ID expected by the driver, `spec.driver` is correct, `volumeSnapshotRef` points back to the namespaced object, and `sourceVolumeMode` describes the original volume.

The CSI `ListSnapshots` RPC is optional. When a driver supports it, the sidecar can discover imported snapshot readiness and metadata. When it does not, the API contract permits the imported snapshot to be marked ready without all metadata. A static import that remains false with an error usually points to an unrecognized handle, inaccessible backend asset, or binding problem—not a reason to patch status.

## Recreate only after protecting the backend asset

`VolumeSnapshot.spec.source` is immutable. If it is wrong, create a corrected snapshot with a new name. The API permits changing `spec.volumeSnapshotClassName`, but once content has been created, changing the request does not migrate or recreate that content; create a corrected snapshot with a new name in that case. Before deleting the failed object, inspect the bound content's `deletionPolicy`:

```bash
kubectl get volumesnapshotcontent "$CONTENT_NAME" \
  -o jsonpath='{.spec.deletionPolicy}{"\n"}'
```

With `Delete`, removal can trigger deletion of a partially or fully created backend snapshot. With `Retain`, the content and backend asset require later administrator cleanup. Capture the object YAML, events, logs, component versions, and sanitized handles before changing state.

Never remove snapshot finalizers or write `status.readyToUse: true` manually. Finalizers protect ordering between the Kubernetes objects and physical snapshot. Bypassing them can trade a visible stuck object for invisible storage leakage or data loss.

## Official Documentation

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI VolumeSnapshot API status fields](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes CSI external-snapshotter behavior and flags](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [External Snapshotter repository](https://github.com/kubernetes-csi/external-snapshotter)
- [Kubernetes CSI VolumeSnapshotClass secrets](https://kubernetes-csi.github.io/docs/secrets-and-credentials-volume-snapshot-class.html)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
