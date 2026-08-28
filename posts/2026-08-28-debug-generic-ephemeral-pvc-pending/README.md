# Why a Generic Ephemeral Volume PVC Stays Pending-and How to Debug Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Generic Ephemeral Volumes, PVC, CSI, StorageClass, Troubleshooting

Description: Trace a generated claim from Pod ownership through scheduling, topology, CSI capacity, provisioning events, quotas, binding, and mount readiness.

---

A generic ephemeral volume creates a real PVC from the Pod's inline `volumeClaimTemplate`. If its StorageClass uses `WaitForFirstConsumer`, `Pending` is initially expected: Kubernetes waits for the scheduler to identify a compatible node before provisioning storage. It becomes a fault when scheduling or provisioning cannot progress; events usually help reveal why.

Debug the generated PVC exactly like an ordinary claim, but include the Pod-owner and deterministic-name checks that are unique to generic ephemeral volumes.

## Find the Generated Claim

Kubernetes names the PVC by joining the Pod name and volume name with a hyphen. For this fragment:

```yaml
metadata:
  name: importer
spec:
  volumes:
    - name: scratch
      ephemeral:
        volumeClaimTemplate:
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-scratch
            resources:
              requests:
                storage: 50Gi
```

the claim is `importer-scratch` in the Pod's namespace:

```bash
kubectl get pod importer -n data -o wide
kubectl get pvc importer-scratch -n data -o wide
```

If the Pod itself does not exist, inspect the error returned by the create or apply operation. If the Pod exists but no PVC does, inspect the Pod and namespace events:

```bash
kubectl describe pod importer -n data
kubectl get events -n data --sort-by=.metadata.creationTimestamp
```

The generated PVC may have failed admission, the ephemeral volume controller may be unhealthy, or a deterministic-name collision may block creation.

## Verify Ownership, Not Just the Name

Two Pod/volume name combinations can produce the same joined PVC name, and a user can create that PVC manually. Kubernetes will not overwrite or reuse a foreign claim. It only uses a generated PVC whose owner reference identifies the Pod.

Inspect it:

```bash
kubectl get pvc importer-scratch -n data -o yaml
kubectl get pod importer -n data -o jsonpath='{.metadata.uid}{"\n"}'
```

Compare the Pod UID with the UID in the PVC's controlling owner reference: the `metadata.ownerReferences[]` entry with `controller: true`. If they do not match, resolve the name collision by safely deleting the unrelated PVC, recreating it under another name if it is still needed, or recreating the Pod with a different Pod/volume naming scheme. Do not attach a foreign claim by editing owner references.

## Read Events on Both Objects

Describe the Pod and PVC before reading controller logs:

```bash
kubectl describe pod importer -n data
kubectl describe pvc importer-scratch -n data
kubectl get events -n data --sort-by=.metadata.creationTimestamp
```

Events usually identify which phase is blocked:

- waiting for first consumer;
- no eligible node satisfies Pod constraints;
- storage class not found;
- no matching PV or provisioner;
- dynamic provisioning failed;
- insufficient capacity in a topology;
- quota exceeded;
- volume binding or mount failed.

Preserve several event cycles. Kubernetes retries many storage operations, so the newest event alone can hide the first useful error.

## Inspect the StorageClass

```bash
kubectl get storageclass fast-scratch -o yaml
```

Verify:

- `provisioner` matches the installed driver;
- `volumeBindingMode` is intentional;
- parameters and mount options are valid for that driver;
- `allowedTopologies`, if present, match labels the CSI driver actually advertises;
- the requested access and volume modes are supported;
- the reclaim policy matches the intended lifecycle.

If `storageClassName` is omitted, Kubernetes uses the default StorageClass when one exists; without a default, the field remains unset until a default becomes available. More than one default can make behavior depend on which default was created most recently. An explicit class is easier to diagnose for ephemeral scratch.

## Check Whether Scheduling Was Bypassed

With `WaitForFirstConsumer`, the scheduler must make the tentative node choice. A Pod that sets `spec.nodeName` bypasses the scheduler and can leave its PVC `Pending` forever. Use `nodeSelector` or node affinity instead:

```yaml
spec:
  nodeSelector:
    kubernetes.io/hostname: worker-07
```

Then check all scheduling constraints together:

```bash
kubectl describe pod importer -n data
kubectl get nodes --show-labels
kubectl get storageclass fast-scratch -o yaml
```

CPU, memory, extended resources, taints, affinity, topology spread, and storage topology must intersect on at least one node. Relaxing one constraint does not help when another still makes the intersection empty.

## Inspect the CSI Driver and Capacity Objects

```bash
kubectl get csidriver -o yaml
kubectl get csinode -o yaml
kubectl get csistoragecapacity --all-namespaces -o yaml
```

For a CSI-backed class, confirm that a `CSIDriver` exists whose `metadata.name` matches the StorageClass provisioner. In each eligible node's `CSINode`, confirm the driver entry and expected `topologyKeys`, then verify those keys' values on the Node labels. If `CSIDriver.spec.storageCapacity` is true, the driver installation should publish suitable `CSIStorageCapacity` objects for late-bound volumes.

No matching capacity object, an unset or zero capacity, or a `maximumVolumeSize` below the request can cause the scheduler to reject a topology. Capacity information can also be stale: Kubernetes may select a node, receive an actual provisioning failure, clear the selection, and retry.

The driver's own controller deployment and logs are vendor-specific. Locate it from the driver's installation documentation rather than assuming a namespace or container name.

## Separate Provisioning from Mounting

Check the PVC phase and PV name:

```bash
kubectl get pvc importer-scratch -n data \
  -o custom-columns=PHASE:.status.phase,PV:.spec.volumeName,CLASS:.spec.storageClassName
```

- **PVC Pending, no PV:** scheduling, matching, or provisioning is blocked.
- **PVC Bound, Pod Pending:** investigate scheduler constraints or volume attachment.
- **Pod scheduled, container waiting:** inspect applicable attach, stage/publish, format, and mount failures in Pod events, `VolumeAttachment` status, and kubelet or CSI node-plugin logs.

Once bound, inspect the exact PV:

```bash
pv_name=$(kubectl get pvc importer-scratch -n data \
  -o jsonpath='{.spec.volumeName}')
kubectl get pv "$pv_name" -o yaml
```

Verify PV node affinity, CSI driver, volume handle, access mode, and reclaim policy. Do not edit a dynamically provisioned PV merely to force a topology match.

## Check Namespace Policy and Quotas

Generic ephemeral volumes let a user create PVCs indirectly through Pods. Normal namespace PVC and storage quotas still apply:

```bash
kubectl get resourcequota,limitrange -n data
kubectl describe resourcequota -n data
kubectl describe limitrange -n data
```

Check `persistentvolumeclaims`, `requests.storage`, and any StorageClass-specific quota keys. A LimitRange can also reject a claim below its minimum or above its maximum storage request. If claim creation is rejected, the PVC does not exist; the ephemeral volume controller emits a `FailedBinding` warning event on the Pod with the API rejection.

## Use a Minimal Reproduction

After preserving evidence, test the same class with a small Pod that has no extra affinity, device resources, or topology-spread constraints. Keep the access mode, volume mode, and StorageClass unchanged. This separates a driver/class failure from an impossible workload constraint.

Do not change several fields on the production Pod at once. Generated PVCs are tied to the Pod owner and name; deleting and recreating a Pod can delete and reprovision its scratch volume. Copy any needed data before destructive testing.

## Confirm Cleanup After the Fix

Once provisioning succeeds, start separate watches for the disposable test Pod's PVC and PV, then delete the Pod from another terminal:

```bash
# Terminal 1
kubectl get pvc -n data --watch

# Terminal 2
kubectl get pv --watch

# Terminal 3
kubectl delete pod importer-test -n data
```

The Pod-owned PVC should be garbage-collected. With a dynamically provisioned StorageClass using `Delete`, the PV and backing volume normally follow; verify the backing volume separately with driver or provider tooling. Diagnose stuck finalizers before removing them. A `Retain` policy intentionally leaves the PV and storage asset for manual reclamation; follow Kubernetes and driver documentation for cleanup.

## Official Documentation

- [Kubernetes: generic ephemeral volumes, ownership, naming, and security](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes: StorageClass binding modes and topology](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: CSI storage capacity tracking and retries](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes: resource quotas for PVCs and storage](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: limiting PVC storage consumption](https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/)

## Conclusion

Start with the generated PVC's ownership and events, then follow the chain through StorageClass, scheduler, topology, CSI capacity, provisioning, and mount. `Pending` under `WaitForFirstConsumer` is normal only while a viable scheduling decision is still forming; repeated events usually point to the constraint or controller that prevents progress.
