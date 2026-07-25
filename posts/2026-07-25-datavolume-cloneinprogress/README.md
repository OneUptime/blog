# How to Troubleshoot a DataVolume Clone Stuck in `CloneInProgress`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataVolume, Troubleshooting

Description: Diagnose a long-running CDI clone by identifying its strategy, checking source and target storage, and following worker or CSI events.

---

In CDI's current phase model, `CloneInProgress` is the host-assisted copy phase. Optimized paths use more specific phases such as `CSICloneInProgress`, `SnapshotForSmartCloneInProgress`, and `SmartClonePVCInProgress`. A dashboard may summarize all of these as a clone in progress, so read the DataVolume's exact `status.phase` before choosing a troubleshooting path.

For a large host-assisted copy on slow storage, `CloneInProgress` can be legitimate for a long time. A genuinely stuck clone usually has evidence in DataVolume conditions, PVC annotations, Pod state, VolumeSnapshot resources, or CSI events.

Do not delete the DataVolume as the first troubleshooting step. Its target PVC may contain a partially copied disk, and owner references can make deletion remove storage.

## Establish the Clone Topology

Record the source and target from the DataVolume:

```bash
kubectl get datavolume cloned-root -n vm-lab -o yaml
kubectl describe datavolume cloned-root -n vm-lab
```

Extract the source reference and phase:

```bash
kubectl get datavolume cloned-root -n vm-lab \
  -o jsonpath='{.spec.source.pvc.namespace}{"/"}{.spec.source.pvc.name}{" -> "}{.metadata.namespace}{"/"}{.metadata.name}{" phase="}{.status.phase}{"\n"}'
```

Inspect both claims:

```bash
kubectl describe pvc source-root -n golden-images
kubectl describe pvc cloned-root -n vm-lab
kubectl get pvc source-root -n golden-images -o yaml
kubectl get pvc cloned-root -n vm-lab -o yaml
```

Confirm target capacity is at least the source requirement and note StorageClass and volume mode.

## Identify the Selected Strategy

The target PVC records clone metadata:

```bash
kubectl get pvc cloned-root -n vm-lab \
  -o jsonpath='{.metadata.annotations.cdi\.kubevirt\.io/cloneType}{"\n"}{.metadata.annotations.cdi\.kubevirt\.io/cloneFallbackReason}{"\n"}{.metadata.annotations.cdi\.kubevirt\.io/clonePhase}{"\n"}'
```

Typical paths are:

- `copy`: host-assisted transfer using CDI Pods
- `csi-clone`: CSI volume clone
- `snapshot`: temporary snapshot and restore

CDI versions and volume-populator paths can expose different intermediate annotations and phases. Use the complete YAML and events when a field is empty.

## If It Is a Host-Assisted Copy

List CDI clone Pods in both namespaces. With the volume-populator path, a temporary target PVC and both workers can be in the source namespace:

```bash
kubectl get pods -n golden-images --show-labels
kubectl get pods -n vm-lab --show-labels
kubectl get pods -A \
  -l cdi.kubevirt.io=cdi-clone-source \
  -o wide
```

Describe any source and target workers you find:

```bash
kubectl describe pod CLONE_SOURCE_POD -n SOURCE_POD_NAMESPACE
kubectl describe pod CLONE_TARGET_POD -n TARGET_POD_NAMESPACE
```

Read every relevant container log:

```bash
kubectl logs CLONE_SOURCE_POD -n SOURCE_POD_NAMESPACE \
  --all-containers \
  --timestamps
kubectl logs CLONE_TARGET_POD -n TARGET_POD_NAMESPACE \
  --all-containers \
  --timestamps
```

Check for:

- source or target PVC mount failures
- Pod Pending due to topology, taints, quota, or resource requests
- NetworkPolicy blocking the TLS-secured connection between clone Pods
- OOMKilled or node pressure
- no-space errors
- source Pod restarts
- very low but nonzero transfer throughput

Cross-namespace default-deny policies must allow the specific CDI-managed clone traffic required by your CDI version and cluster design. Create the narrowest policy based on observed Pod labels, ports, and official platform guidance.

## If It Is a CSI Clone

CSI cloning is represented through PVC provisioning rather than a byte-copy Pod. Inspect target PVC events and the external provisioner:

```bash
kubectl describe pvc cloned-root -n vm-lab
kubectl get pvc cloned-root -n vm-lab -o yaml
kubectl get csidriver
kubectl get pods -A | grep -E 'csi|provisioner'
```

Look for provisioning retries, unsupported data sources, backend timeouts, capacity exhaustion, and source-in-use restrictions. Confirm:

- source and target StorageClasses resolve to the same CSI driver; the class names can differ if the driver supports cross-class cloning
- volume modes match
- the target StorageProfile's effective `status.cloneStrategy` is `csi-clone`
- the driver version supports volume cloning
- source is not mounted

Use the CSI vendor's documented controller logs and backend status. Restarting a provisioner during a live storage operation can have broader impact and is not a routine first step.

## If It Is a Snapshot Clone

Inspect snapshot API objects:

```bash
kubectl get volumesnapshot -A
kubectl get volumesnapshotcontent
kubectl get volumesnapshotclass
```

Describe the temporary snapshot related to the clone:

```bash
kubectl describe volumesnapshot SNAPSHOT_NAME -n golden-images
```

Check `readyToUse`, snapshot controller events, matching driver names, restore size, and backend snapshot health. A snapshot that is still being created is slow, not necessarily stuck. A snapshot with repeated error conditions needs storage-provider investigation.

## Check Source Use and Authorization

Find Pods and VMIs using the source:

```bash
kubectl get pod -n golden-images -o wide
kubectl get vmi -A
```

Efficient clone paths require an unused source. For cross-namespace clones, verify the creating actor:

```bash
kubectl auth can-i create datavolumes.cdi.kubevirt.io \
  --subresource=source \
  --namespace=golden-images \
  --as=system:serviceaccount:vm-lab:vm-builder
```

Authorization failures usually appear early, but verifying the real actor avoids chasing storage for an admission problem.

## Decide Whether Progress Is Real

Compare timestamps and logs at intervals instead of imposing a universal timeout:

```bash
kubectl get datavolume cloned-root -n vm-lab \
  -o jsonpath='{.metadata.creationTimestamp}{" "}{.status.phase}{"\n"}'
kubectl get events -n vm-lab \
  --sort-by=.metadata.creationTimestamp
```

For host-assisted copies, monitor storage throughput and Pod network traffic through your cluster observability system. For CSI or snapshot paths, monitor backend task state.

A stable phase with increasing bytes or a live backend job is slow. A stable phase with repeated errors, terminated workers, or no backing operation is stuck.

## Recover Without Losing the Source

Fix scheduling, network, quota, capacity, or storage backend issues first and let CDI reconcile. If the operation has irrecoverably failed, create a new target DataVolume name after preserving diagnostics. This avoids assuming that deleting the old object is harmless.

Never modify the source PVC contents during a clone. Keep the source intact until the new DataVolume reports `Succeeded` and the cloned disk has passed a boot or filesystem integrity check.

## Official Documentation

- [CDI DataVolume clone phases](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI efficient clone paths](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/efficient-cloning.md)
- [CDI host-assisted cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/clone-datavolume.md)
- [Kubernetes volume cloning](https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/)
