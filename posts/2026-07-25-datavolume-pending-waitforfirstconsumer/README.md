# Why Is My CDI DataVolume Stuck in Pending or `WaitForFirstConsumer`?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, DataVolume, Troubleshooting

Description: Diagnose CDI DataVolumes in Pending or WaitForFirstConsumer and distinguish healthy topology-aware waiting from real provisioning failures.

---

`WaitForFirstConsumer` is often expected behavior, not a failed import. A StorageClass with delayed binding waits until Kubernetes schedules a consumer so the storage provisioner can choose the correct zone or node. CDI honors that behavior to avoid binding a VM disk where the eventual KubeVirt workload cannot use it.

Plain `Pending` is less specific. It can mean no matching volume exists, dynamic provisioning failed, quota blocked the PVC, CDI could not infer storage properties, or no default StorageClass was selected.

## Identify Which Layer Is Waiting

Start with the DataVolume, its PVC, the StorageClass, and namespace events:

```bash
namespace=vm-lab
dv=web-root

kubectl get datavolume "$dv" -n "$namespace" -o wide
kubectl describe datavolume "$dv" -n "$namespace"
kubectl get pvc "$dv" -n "$namespace" -o wide
kubectl describe pvc "$dv" -n "$namespace"
kubectl get events -n "$namespace" \
  --sort-by=.metadata.creationTimestamp
```

Find the selected StorageClass:

```bash
kubectl get pvc web-root -n vm-lab \
  -o jsonpath='{.spec.storageClassName}{"\n"}'
kubectl get storageclass fast-local -o yaml
```

The important StorageClass field is:

```yaml
volumeBindingMode: WaitForFirstConsumer
```

If the DataVolume phase is `WaitForFirstConsumer` and the PVC event says it is waiting for a first consumer, CDI is deliberately not starting its importer, uploader, or clone Pod yet. On CSI-backed storage where CDI uses volume populators, the equivalent delayed-binding phase is `PendingPopulation`, and the target PVC remains Pending until population completes.

## Why CDI Does Not Bind It Immediately

Local and topology-constrained storage cannot be attached from every node. If CDI's temporary importer Pod triggered binding by itself, it might select a node that conflicts with the VM's node selector, affinity, devices, or other disks.

With CDI's `HonorWaitForFirstConsumer` behavior, KubeVirt initiates placement using a consumer with the VM's scheduling requirements. KubeVirt understands DataVolumes and can participate in this flow without booting from incomplete content. In the legacy flow, CDI starts data population after the target PVC is bound. With CDI volume populators, a temporary PVC is bound and populated, and the target PVC becomes Bound only after population completes. In both flows, the VM waits for the DataVolume to succeed.

Use a VM that references the DataVolume:

```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: web-vm
  namespace: vm-lab
spec:
  runStrategy: Always
  template:
    metadata:
      labels:
        kubevirt.io/domain: web-vm
    spec:
      nodeSelector:
        workload.example.com/virtualization: "true"
      domain:
        resources:
          requests:
            memory: 2Gi
        devices:
          disks:
            - name: root
              disk:
                bus: virtio
      volumes:
        - name: root
          dataVolume:
            name: web-root
```

Watch the complete sequence:

```bash
kubectl get vm,vmi,datavolume,pvc,pod -n vm-lab -w
```

Do not set `spec.nodeName` on a consumer Pod to solve delayed binding. Kubernetes documents that `nodeName` bypasses the scheduler and can leave a `WaitForFirstConsumer` PVC Pending. Use node selectors or affinity instead.

## When Pending Indicates a Real Problem

Investigate further when events show any of these conditions:

- no default StorageClass and the DataVolume did not name one
- `FailedBinding` because no PV matches the requested size, class, access mode, or volume mode
- a CSI provisioner error or unavailable external provisioner
- `ErrClaimNotValid` because CDI cannot infer access and volume modes
- namespace `ResourceQuota` limits on PVC count or requested storage
- an invalid or deleted StorageClass
- node affinity or capacity constraints that prevent any valid consumer placement

Useful checks include:

```bash
kubectl get storageclass
kubectl get storageprofile
kubectl get storageprofile fast-local -o yaml
kubectl get resourcequota,limitrange -n vm-lab
kubectl get csidrivers
kubectl get pods -A | grep -E 'csi|provisioner'
```

If the StorageProfile has empty `status.claimPropertySets`, specify `storage.accessModes` and `storage.volumeMode` directly or have the storage administrator configure the profile.

## Force Binding Only for the Right Workload

CDI supports this annotation:

```yaml
metadata:
  annotations:
    cdi.kubevirt.io/storage.bind.immediate.requested: "true"
```

`virtctl image-upload` also exposes `--force-bind`. Both cause a CDI worker Pod to trigger binding without waiting for the final workload's placement.

That is useful for a topology-independent golden-image workflow where immediate population is more important than the placement of one VM. It is risky for local or zonal storage attached to a VM with scheduling constraints. Once a volume is provisioned in the wrong topology, changing the annotation does not relocate the data.

Before forcing binding, answer:

1. Can every eligible VM node access this storage?
2. Does the VM have node selectors, device requirements, or other topology-bound PVCs?
3. Is this a reusable source image rather than a VM-specific disk?
4. Does the storage backend support cloning the populated image into the eventual target topology?

If any answer is uncertain, let KubeVirt and the scheduler drive the first-consumer flow.

## Confirm Progress Safely

A healthy legacy import sequence usually looks like:

```text
WaitForFirstConsumer
PVCBound
ImportScheduled
ImportInProgress
Succeeded
```

For CSI-backed DataVolumes using CDI volume populators, the delayed-binding import sequence starts with `PendingPopulation`, and the target PVC does not need to expose `PVCBound` before the import:

```text
PendingPopulation
ImportScheduled
ImportInProgress
Succeeded
```

The exact intermediate phases depend on the operation and CDI version. Treat events and conditions as the authoritative explanation rather than imposing a short timeout on slow image transfers.

If a VM exists but nothing advances, describe the VM and its VirtualMachineInstance too:

```bash
kubectl describe vm web-vm -n vm-lab
kubectl describe vmi web-vm -n vm-lab
```

The scheduler may be unable to find a node satisfying both the VM and volume constraints. That is a scheduling problem, not an importer problem.

## Official Documentation

- [CDI WaitForFirstConsumer handling](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/waitforfirstconsumer-storage-handling.md)
- [CDI DataVolume phases](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [Kubernetes StorageClass volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- [Kubernetes persistent volume claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
