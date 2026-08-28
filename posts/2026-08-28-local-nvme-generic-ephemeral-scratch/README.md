# How to Back Kubernetes Scratch Space with Local NVMe and Automatic Pod-Lifecycle Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NVMe, Generic Ephemeral Volumes, CSI, Local Storage, Scratch Storage

Description: Use a topology-aware local CSI provisioner and Pod-owned generic ephemeral PVC so fast NVMe scratch is allocated and reclaimed with the workload.

---

Local NVMe can provide high-throughput scratch storage, but Kubernetes does not dynamically provision built-in `local` PersistentVolumes. A `StorageClass` with `kubernetes.io/no-provisioner` and manually created local PVs can use `WaitForFirstConsumer`, yet it does not create a fresh volume or sanitize it automatically for each Pod.

For Pod-lifecycle allocation and cleanup, use a local-storage CSI driver that explicitly supports dynamic provisioning and deletion. Expose its administrator-controlled parameters through a `StorageClass`, then request it as a generic ephemeral volume. Kubernetes owns the PVC lifecycle; the CSI driver owns device allocation, filesystem creation, unmounting, deletion, and sanitization.

## Define the Required Contract First

Before selecting a driver, require all of these capabilities:

- dynamic provisioning from node-local NVMe;
- topology reporting at node granularity;
- `WaitForFirstConsumer` support;
- the required filesystem or raw-block `volumeMode`;
- cleanup for a `Delete` reclaim policy;
- capacity reporting or a documented retry model;
- safe reuse or sanitization between tenants;
- recovery behavior after node reboot, Pod force-deletion, or controller outage.

Generic ephemeral volumes do not add those capabilities to a driver. They create an ordinary PVC and use the driver's ordinary provisioning path.

## Prepare NVMe Outside the Workload

Use the node and CSI vendor's supported installation procedure. A typical design dedicates devices, partitions, an LVM thin pool, or a filesystem subtree to the driver. Do not let application Pods format `/dev/nvme*` directly.

Label only nodes that have been admitted into the storage pool:

```bash
kubectl label node worker-07 storage.example.com/local-nvme=true
kubectl label node worker-08 storage.example.com/local-nvme=true
```

The label is a scheduling policy, not proof of usable capacity. Monitor device health, wear, temperature, filesystem or thin-pool free space, and the CSI driver's reported capacity separately.

## Create a Driver-Specific StorageClass

This manifest shows the Kubernetes lifecycle fields. The provisioner and parameters are placeholders:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-nvme-scratch
provisioner: local-nvme.csi.example.com
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
allowVolumeExpansion: false
parameters:
  pool: scratch
  fsType: xfs
```

Use only parameter names documented by the installed CSI driver. `WaitForFirstConsumer` lets the scheduler choose a node that satisfies the Pod and has the storage topology. `Delete` tells the provisioner to remove the backing volume after the claim is released.

Do not substitute the built-in class below and expect dynamic cleanup:

```yaml
provisioner: kubernetes.io/no-provisioner
```

Kubernetes documentation explicitly states that built-in local volumes do not support dynamic provisioning. They require pre-created PVs and a separate local-volume management process.

## Request NVMe as a Generic Ephemeral Volume

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sort-shards
  namespace: batch
spec:
  ttlSecondsAfterFinished: 3600
  template:
    metadata:
      labels:
        app.kubernetes.io/name: sort-shards
    spec:
      restartPolicy: Never
      nodeSelector:
        storage.example.com/local-nvme: "true"
      containers:
        - name: sorter
          image: registry.example.com/sorter:2.8.1
          args: ["--scratch=/scratch"]
          volumeMounts:
            - name: scratch
              mountPath: /scratch
      volumes:
        - name: scratch
          ephemeral:
            volumeClaimTemplate:
              metadata:
                labels:
                  storage-purpose: disposable-scratch
              spec:
                accessModes: ["ReadWriteOnce"]
                storageClassName: local-nvme-scratch
                resources:
                  requests:
                    storage: 200Gi
```

For the Job Pod, Kubernetes creates a claim named from the Pod and `scratch` volume. Because Job-created Pod names contain a generated suffix, discover the actual names instead of predicting them:

```bash
kubectl get pod,pvc -n batch \
  -l app.kubernetes.io/name=sort-shards -o wide
```

The generated PVC is owned by the Pod, not by the Job directly.

## Follow the Complete Cleanup Chain

Automatic cleanup has several asynchronous steps:

1. The application exits.
2. The Job controller retains or deletes the completed Pod according to Job and TTL policy.
3. When the Pod object is deleted, garbage collection deletes its owned PVC.
4. The PV moves through release and deletion.
5. The CSI provisioner performs `DeleteVolume` and returns capacity to its local pool.
6. The driver sanitizes or recreates the backing allocation according to its documented policy.

A completed Pod that remains in the API keeps its generic ephemeral PVC. `ttlSecondsAfterFinished` applies to the finished Job and eventually removes dependents; it does not mean the NVMe is reclaimed at container exit.

Watch all layers in a test namespace:

```bash
kubectl get job,pod,pvc -n batch --watch
kubectl get pv --watch
kubectl get events -n batch --sort-by=.metadata.creationTimestamp
```

Also verify capacity in the CSI driver's own tooling. A deleted Kubernetes object does not prove the physical extent was returned or sanitized.

## Plan for Node-Local Failure

Local NVMe is tied to one node. If that node fails:

- the scratch data may be permanently unavailable;
- the Pod can be recreated on another eligible node with a new empty volume;
- a volume still attached to the failed node can require CSI-driver recovery;
- Kubernetes cannot reconstruct uncommitted scratch data.

Design the job so durable inputs come from object storage, a database, or a network volume and durable outputs are committed before success. Treat `/scratch` as replaceable state.

Do not set `spec.nodeName`; it bypasses the scheduler and can leave a `WaitForFirstConsumer` claim Pending. Use selectors or affinity and let scheduling and provisioning coordinate.

## Enforce Isolation and Capacity

Local NVMe can leak data if a driver reuses extents without sanitization. Validate the driver's deletion and wipe policy for the threat model. Use node access controls and encrypted scratch where required; an encrypted filesystem whose key is discarded can be faster to sanitize, but only if the vendor supports that design.

Apply namespace storage quotas because users who can create Pods with generic ephemeral volumes can indirectly create PVCs. Limit:

- total `requests.storage`;
- PVC count;
- StorageClass-specific requested capacity and claim count.

Capacity overcommit needs operational alerts. A PVC request is a scheduling and allocation contract, but local thin pools and filesystems can still run out if the driver permits overcommit.

## Avoid `hostPath` for Managed Scratch

A `hostPath` volume exposes an arbitrary node path and has no PVC, StorageClass, capacity, ownership, or cleanup controller. It can also expose host credentials or files if misconfigured. It is not a substitute for a local CSI volume in a multi-tenant cluster.

A disk-backed `emptyDir` is simpler and kubelet-managed, but it normally uses the kubelet's local ephemeral-storage filesystem and does not select a dedicated NVMe pool per Pod. Use it when that node layout and its softer capacity semantics meet the requirement.

## Test Destructive Lifecycle Cases

Before production, verify:

1. normal Job completion and TTL deletion;
2. manual Pod deletion;
3. Pod eviction;
4. kubelet and node reboot;
5. CSI controller restart during deletion;
6. node loss with an allocated volume;
7. a full local pool;
8. data sanitization before reuse.

Do not remove PV, PVC, or attachment finalizers merely to make objects disappear. Finalizers protect in-progress storage operations; use the driver's documented recovery workflow.

## Official Documentation

- [Kubernetes: generic ephemeral volumes and PVC ownership](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes: StorageClass binding and built-in local-volume limitations](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: dynamic volume provisioning](https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/)
- [Kubernetes: CSI storage capacity](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes: automatic cleanup for finished Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/)
- [Kubernetes: hostPath security warning](https://kubernetes.io/docs/concepts/storage/volumes/#hostpath)

## Conclusion

Automatic NVMe scratch cleanup needs two cooperating layers: a Pod-owned generic ephemeral PVC and a local CSI driver that can dynamically allocate, delete, and sanitize storage. Use late binding, explicit `Delete` reclaim behavior, durable external inputs and outputs, and lifecycle tests that include node failure. Built-in local PVs and `hostPath` do not provide that contract by themselves.
