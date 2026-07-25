# Why CDI Needs Scratch Space—and How to Choose Its StorageClass and Size

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, Scratch Space, StorageClass

Description: Understand which CDI operations need scratch PVCs, how CDI selects their StorageClass, and how to plan capacity, quota, and topology.

---

CDI uses scratch space when an image cannot be streamed directly into its final form. Scratch is a temporary PVC, not container ephemeral storage. That design gives CDI predictable capacity and avoids filling a node's shared `emptyDir` storage with a large VM image.

CDI requests scratch space with the same size as the DataVolume and removes it after the operation completes. Scratch is always `ReadWriteOnce` and `Filesystem`, even when the target DataVolume is block mode.

## Which Operations Need Scratch

CDI's current documentation lists these important cases:

- registry imports that use `pullMethod: pod`, because CDI downloads and extracts ContainerDisk layers before conversion; node-pull imports use the node runtime instead
- image uploads that must be saved before qemu-img processing
- HTTP imports from servers that do not support the streaming behavior CDI needs, such as suitable range or `HEAD` requests
- HTTP imports of non-raw images that use custom certificates

Implementation paths evolve, so inspect actual temporary PVCs and events for your installed CDI version:

```bash
kubectl get pvc -n vm-images
kubectl get pods -n vm-images -o wide
kubectl get events -n vm-images \
  --sort-by=.metadata.creationTimestamp
```

An import that does not require scratch can succeed even if no scratch StorageClass is available. An operation that needs it cannot.

## Understand StorageClass Selection

CDI selects the scratch class in this order:

1. Use `CDIConfig.status.scratchSpaceStorageClass` when it names an existing class.
2. If that value is blank, use the StorageClass of the target PVC.

Inspect the effective value:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.scratchSpaceStorageClass}{"\n"}'
kubectl get cdi cdi \
  -o jsonpath='{.spec.config.scratchSpaceStorageClass}{"\n"}'
```

Also inspect the target:

```bash
kubectl get pvc vm-root -n vm-images \
  -o jsonpath='{.spec.storageClassName}{"\n"}'
```

The status field is the reconciled configuration CDI uses. A blank spec can still produce a status value derived from the system default.

## Choose a Suitable Scratch StorageClass

A scratch class should:

- dynamically provision `ReadWriteOnce`, `Filesystem` PVCs
- have enough aggregate capacity for concurrent imports
- be reachable by nodes eligible for CDI worker Pods
- provide adequate sequential write and read throughput
- support the namespace's quota and allowed topology
- have a reclaim policy and cleanup behavior understood by operators

Fast temporary storage can shorten qcow2 conversion, but it must be durable for the lifetime of the operation. Local storage can constrain scheduling and complicate recovery after a node failure. Network storage can be easier to schedule but may become a shared bottleneck.

Do not choose a block-only class. Scratch is filesystem mode regardless of the target's mode.

Test a small claim before changing CDI:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: scratch-class-test
  namespace: cdi-test
spec:
  storageClassName: cdi-scratch
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 1Gi
```

After the test is reviewed, clean it up through your normal storage-change process.

## Configure the Class Cluster-Wide

Patch the CDI custom resource:

```bash
kubectl patch cdi cdi \
  --type merge \
  --patch '{
    "spec": {
      "config": {
        "scratchSpaceStorageClass": "cdi-scratch"
      }
    }
  }'
```

Verify reconciliation:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.scratchSpaceStorageClass}{"\n"}'
```

This affects CDI operations across namespaces. Coordinate the change with storage capacity, quota, backup exclusion, topology, and cost policies. Do not point production CDI at a class merely because it is the cluster default.

## Plan Capacity for Peak Concurrency

If each DataVolume requests 100 GiB and ten pod-pull registry imports run together, scratch may request roughly ten additional 100 GiB PVCs while the ten target PVCs also exist. Thin provisioning can hide physical consumption until conversion writes data.

Plan for:

```text
peak target allocation
+ peak concurrent scratch allocation
+ backend metadata and replication
+ safety headroom
```

The scratch PVC request follows the DataVolume size. There is no per-DataVolume field to request a tiny scratch disk for a large target. A qcow2's compressed download size is not a safe scratch sizing basis because extraction and conversion operate on its virtual representation.

Check namespace limits:

```bash
kubectl get resourcequota,limitrange -n vm-images -o yaml
kubectl describe resourcequota -n vm-images
```

Quotas may count both target and temporary PVC requests.

## Diagnose Scratch Failures

List claims with creation timestamps and owners:

```bash
kubectl get pvc -n vm-images \
  -o custom-columns=NAME:.metadata.name,CREATED:.metadata.creationTimestamp,CLASS:.spec.storageClassName,SIZE:.spec.resources.requests.storage,STATUS:.status.phase
```

Then describe the temporary claim:

```bash
kubectl describe pvc SCRATCH_PVC_NAME -n vm-images
```

Common failures include:

- no valid scratch class
- class cannot provision filesystem volumes
- quota counts the target plus scratch and rejects the second claim
- insufficient backend capacity
- topology constraints leave the worker unschedulable
- scratch filesystem fills because backend-reported usable capacity is lower than expected
- stale temporary resources from interrupted operations

Do not manually delete a scratch PVC while its CDI worker is running. That can turn a slow operation into a failed one. Establish ownership and operation state first.

## Monitor and Alert

Track:

- Pending scratch PVC count and age
- requested and actual capacity by scratch class
- CDI worker duration and failure reason
- concurrent imports, uploads, and registry conversions
- backend latency and capacity
- orphaned temporary claims after controller or node failures

A scratch class is part of the image supply chain. Capacity and availability should be managed with the same care as the final VM storage.

## Official Documentation

- [CDI scratch-space behavior](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/scratch-space.md)
- [CDI scratchSpaceStorageClass configuration](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-config.md)
- [CDI DataVolume import sources](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
