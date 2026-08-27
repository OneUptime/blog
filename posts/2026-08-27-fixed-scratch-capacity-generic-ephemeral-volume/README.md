# How to Guarantee Fixed Scratch-Disk Capacity with a Generic Ephemeral Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Generic Ephemeral Volumes, PVC, StorageClass, Scratch Storage, CSI

Description: Provision Pod-scoped scratch as an automatically owned PVC with a requested capacity, topology-aware binding, and predictable cleanup.

---

A disk-backed `emptyDir.sizeLimit` is enforced through kubelet usage measurement and Pod eviction. It does not create a dedicated filesystem whose capacity is reserved for the Pod. When an application needs a provisioned scratch volume with fixed capacity, use a generic ephemeral volume backed by a suitable StorageClass.

Generic ephemeral volumes have been stable since Kubernetes 1.23. The Pod embeds a `volumeClaimTemplate`; Kubernetes creates a real PVC, binds or provisions storage, and makes the Pod the claim's owner.

## Request the Scratch Capacity in the Pod

This Pod asks an existing StorageClass named `fast-scratch` for 20 GiB:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-worker
  namespace: batch
spec:
  restartPolicy: Never
  containers:
    - name: worker
      image: registry.example.com/batch-worker:5.4.0
      volumeMounts:
        - name: scratch
          mountPath: /scratch
      resources:
        requests:
          ephemeral-storage: 256Mi
        limits:
          ephemeral-storage: 1Gi
  volumes:
    - name: scratch
      ephemeral:
        volumeClaimTemplate:
          metadata:
            labels:
              purpose: batch-scratch
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-scratch
            resources:
              requests:
                storage: 20Gi
```

The automatically created PVC is named from the Pod and volume: `batch-worker-scratch`. The ephemeral volume controller creates it in the `batch` namespace and sets an owner reference to the Pod.

Kubernetes documents fixed-size volumes as a generic ephemeral capability. The storage driver and volume mode determine the actual mounted filesystem behavior. A filesystem has metadata and can reserve blocks, so application-usable bytes reported by `df` may be somewhat less than the PVC's nominal capacity. Performance, thin provisioning, and backend overcommit also remain driver-specific.

## Prefer WaitForFirstConsumer

Kubernetes recommends a StorageClass with `volumeBindingMode: WaitForFirstConsumer` for generic ephemeral volumes. Binding then occurs after the scheduler tentatively selects a node, allowing the provisioner to honor topology:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-scratch
provisioner: csi.example.com
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

`csi.example.com` is a placeholder. Use the provisioner and parameters documented by the installed CSI driver. Do not create a StorageClass from this fragment without those driver-specific values.

With immediate binding, the volume is created before Pod scheduling and can constrain the scheduler to nodes that can access it. `WaitForFirstConsumer` lets scheduling and topology-aware provisioning work together. Capacity tracking also requires support from the CSI driver; stale capacity information can still cause a provisioning retry.

## Verify the PVC and Provisioned Capacity

Watch the Pod, claim, and events together:

```bash
kubectl get pod batch-worker -n batch --watch
kubectl get pvc batch-worker-scratch -n batch -o yaml
kubectl describe pvc batch-worker-scratch -n batch
kubectl get events -n batch --sort-by=.lastTimestamp
```

Compare the requested and reported capacity:

```bash
kubectl get pvc batch-worker-scratch -n batch \
  -o jsonpath='{.spec.resources.requests.storage}{" requested, "}{.status.capacity.storage}{" provisioned\n"}'
```

The Pod cannot use the volume until normal claim binding and mount steps succeed. If it remains Pending, inspect the PVC Events, StorageClass, CSI provisioner, topology, access mode, namespace storage quota, and available backend capacity.

Inside the running Pod, verify the filesystem and write behavior:

```bash
kubectl exec -n batch batch-worker -- df -h /scratch
kubectl exec -n batch batch-worker -- df -i /scratch
```

Unlike a default disk-backed `emptyDir`, this path is a provisioned volume. The driver and filesystem enforce its capacity rather than kubelet waiting to evict the Pod for crossing an `emptyDir` directory limit.

## Keep Volume Capacity and ephemeral-storage Separate

The 20 GiB PVC request is not a request for the Pod's local `ephemeral-storage` resource. It is storage capacity consumed through the PV subsystem. The example still declares local `ephemeral-storage` for the worker's writable container layer and container logs.

The boundaries are:

| Consumer | Accounting |
| --- | --- |
| generic ephemeral `/scratch` | PVC request, provisioned capacity, storage quota |
| container writable layer | local `ephemeral-storage` |
| container stdout and stderr logs | local `ephemeral-storage` |
| disk-backed `emptyDir` | local `ephemeral-storage` plus its own size limit |
| memory-backed `emptyDir` | container memory |

CSI ephemeral volumes are different again. They have no PVC, are prepared after scheduling, do not support capacity-aware scheduling, and are not covered by Pod storage usage limits. Use generic ephemeral when a standard storage request and fixed capacity are requirements.

## Understand Cleanup and Retention

When the Pod is deleted, Kubernetes garbage collection deletes its owned generic ephemeral PVC. With the common `Delete` reclaim policy, deleting the claim usually deletes the backing volume as well.

A `Retain` reclaim policy intentionally leaves the backing storage after claim deletion. That can help a specialized recovery workflow, but it is no longer automatic scratch cleanup. Document and automate reclamation separately.

The generated PVC name is deterministic, so avoid Pod and volume name combinations that collide with an existing claim. Kubernetes will not overwrite or adopt an unrelated PVC; the Pod remains unable to start until the ownership conflict is resolved.

Creating generic ephemeral volumes also lets a user who can create Pods indirectly create PVCs. Normal namespace PVC and storage quotas still apply. Cluster administrators should enforce admission policy if that does not fit the authorization model.

## Official Documentation

- [Kubernetes generic ephemeral volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#generic-ephemeral-volumes)
- [Kubernetes generic ephemeral volume lifecycle and PVC ownership](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#lifecycle-and-persistentvolumeclaim)
- [Kubernetes StorageClass binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- [Kubernetes storage capacity tracking](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes persistent volumes and claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

## Conclusion

Embed a PVC template in the Pod, request the required storage, and use a topology-aware StorageClass with `WaitForFirstConsumer`. The result is a Pod-owned, provisioned scratch volume with fixed capacity. Continue budgeting local `ephemeral-storage` separately for logs and writable layers, and verify the generated PVC's capacity and cleanup policy.
