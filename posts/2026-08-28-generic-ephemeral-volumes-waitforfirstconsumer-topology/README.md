# How to Schedule Generic Ephemeral Volumes with WaitForFirstConsumer and Storage Topology

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Generic Ephemeral Volumes, StorageClass, WaitForFirstConsumer, CSI, Topology

Description: Delay scratch-volume provisioning until scheduling can combine Pod constraints, CSI capacity, and storage topology on one suitable node.

---

A generic ephemeral volume embeds a `volumeClaimTemplate` in a Pod. Kubernetes creates a real PVC for that Pod, provisions or binds storage, and normally deletes the claim when the Pod is deleted. For topology-constrained storage, the StorageClass should use `WaitForFirstConsumer` so the scheduler can choose a node before the provisioner commits the volume to a zone or host.

Kubernetes recommends late binding for generic ephemeral volumes. With the default `Immediate` binding mode, storage may be provisioned before the scheduler knows the Pod's node selector, affinity, taints, CPU, memory, or other volume constraints. The resulting volume can force the Pod into a topology where it cannot run.

## Verify the Driver Can Provision the Volume

Generic ephemeral volumes are stable since Kubernetes 1.23, but they still depend on a storage provisioner. The driver must support normal persistent-volume dynamic provisioning for the requested StorageClass. Support for inline CSI ephemeral volumes is a different capability and is not required here.

Inventory the storage API objects:

```bash
kubectl get storageclass
kubectl get csidriver
kubectl get csinode
```

Read the installed CSI driver's documentation for:

- dynamic provisioning support;
- topology keys and node requirements;
- access modes and filesystem or block volume modes;
- capacity tracking support;
- StorageClass parameters and reclaim behavior.

Kubernetes itself does not define vendor parameters such as pool, tier, filesystem, encryption, or local-device selection.

## Create a Late-Binding StorageClass

This skeleton shows the Kubernetes fields. Replace the provisioner and parameters with values documented by the installed driver:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: topology-aware-scratch
provisioner: csi.example.com
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
allowVolumeExpansion: false
parameters:
  storageTier: scratch
```

`csi.example.com` and `storageTier` are placeholders, not a deployable driver configuration. `Delete` makes the intended lifecycle explicit; the StorageClass API defaults dynamically provisioned volumes to `Delete` when `reclaimPolicy` is omitted.

Do not mark this class as the cluster default unless all ordinary PVCs should use it. The Pod can request it explicitly.

## Embed the Claim in the Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: render-worker
  namespace: batch
spec:
  restartPolicy: Never
  nodeSelector:
    workload.example.com/class: batch
  containers:
    - name: worker
      image: registry.example.com/render-worker:4.2.0
      resources:
        requests:
          cpu: "2"
          memory: 4Gi
        limits:
          cpu: "4"
          memory: 8Gi
      volumeMounts:
        - name: scratch
          mountPath: /scratch
  volumes:
    - name: scratch
      ephemeral:
        volumeClaimTemplate:
          metadata:
            labels:
              app.kubernetes.io/name: render-worker
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: topology-aware-scratch
            resources:
              requests:
                storage: 100Gi
```

The ephemeral volume controller creates a PVC named `render-worker-scratch` in `batch`. The Pod is its owner. The PVC remains `Pending` while late binding waits for a tentative scheduling decision; that phase alone is not an error.

## Understand the Scheduling Sequence

With `WaitForFirstConsumer`, the control-plane sequence is:

1. The Pod is admitted.
2. The ephemeral volume controller creates the deterministic PVC.
3. The scheduler evaluates normal Pod constraints and volume topology together.
4. A node is tentatively selected.
5. The CSI provisioner creates a volume accessible from that topology, or Kubernetes binds an eligible pre-created PV.
6. The PVC binds and the Pod is committed to the node.
7. Kubelet stages and mounts the volume.

The tentative selection matters. If provisioning reports that capacity is unavailable, Kubernetes can clear that choice and retry scheduling on another eligible node.

## Do Not Bypass the Scheduler with `nodeName`

Kubernetes explicitly warns against setting `spec.nodeName` on a Pod that uses a `WaitForFirstConsumer` volume. `nodeName` bypasses the scheduler, so the PVC can remain `Pending` indefinitely.

To constrain a Pod to one host while retaining scheduling and volume binding, use a node selector:

```yaml
spec:
  nodeSelector:
    kubernetes.io/hostname: worker-07
```

Prefer a stable workload label over a hostname when several equivalent nodes can run the job. Include taints and tolerations, affinity, CPU, memory, device resources, and topology-spread requirements in the design; the selected node must satisfy all of them as well as storage.

## Restrict Topology Only When Required

In most late-binding designs, the CSI driver reports its topology and the scheduler chooses a compatible segment. Add `allowedTopologies` only when policy must limit which segments the StorageClass may use:

```yaml
allowedTopologies:
  - matchLabelExpressions:
      - key: topology.csi.example.com/zone
        values:
          - zone-a
          - zone-b
```

The topology key is driver-specific. Do not assume `topology.kubernetes.io/zone` when the driver advertises a different key. An unnecessary or misspelled restriction can make every node ineligible.

## Enable Capacity-Aware Scheduling When Supported

For CSI volumes using `WaitForFirstConsumer`, a driver can publish `CSIStorageCapacity` objects and set `CSIDriver.spec.storageCapacity: true`. The scheduler then compares the requested size with capacity reported for each accessible topology:

```bash
kubectl get csidriver -o yaml
kubectl get csistoragecapacity --all-namespaces
```

Capacity data can be stale. Kubernetes treats a selected node as tentative and retries when actual provisioning fails. Multi-volume Pods can still require manual recovery if one volume is created in a topology that lacks capacity for another.

Do not manually create `CSIStorageCapacity` objects unless the driver documentation instructs you to; the CSI deployment normally owns them.

## Observe Binding and Mounting

Watch the Pod and generated claim together:

```bash
kubectl get pod render-worker -n batch --watch
kubectl get pvc render-worker-scratch -n batch --watch

kubectl describe pod render-worker -n batch
kubectl describe pvc render-worker-scratch -n batch
kubectl get events -n batch --sort-by=.metadata.creationTimestamp
```

After binding, inspect the PV and its topology without assuming its name:

```bash
pv_name=$(kubectl get pvc render-worker-scratch -n batch \
  -o jsonpath='{.spec.volumeName}')

kubectl get pv "$pv_name" -o yaml
```

Verify the PV's node affinity or CSI topology and the Pod's assigned node are compatible. Then confirm `/scratch` is mounted with the requested filesystem and capacity inside the container.

## Preserve the Ephemeral Cleanup Contract

When the Pod is deleted, Kubernetes garbage collection deletes its owned PVC. With a dynamically provisioned PV using `Delete`, the storage provisioner normally removes the backing volume. Check that behavior with the installed driver before putting sensitive or capacity-limited local storage into service.

A StorageClass with `Retain` intentionally leaves storage behind and therefore needs a separate reclamation process. Force-deleting Pods, PVCs, PVs, or CSI finalizers can bypass orderly cleanup; use the driver's recovery procedure for stuck deletion.

## Official Documentation

- [Kubernetes: ephemeral volumes and generic ephemeral lifecycle](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes: StorageClass volume binding mode and allowed topologies](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: CSI storage capacity tracking](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes API: StorageClass](https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/)
- [Kubernetes API: CSIStorageCapacity](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-storage-capacity-v1/)

## Conclusion

Use `WaitForFirstConsumer` so compute constraints and storage topology are solved in the same scheduling decision. Keep `nodeName` out of the Pod, request a driver-supported StorageClass explicitly, inspect the generated PVC and capacity objects, and test `Delete` cleanup. Late binding prevents a scratch volume from choosing the Pod's topology before the scheduler can.
