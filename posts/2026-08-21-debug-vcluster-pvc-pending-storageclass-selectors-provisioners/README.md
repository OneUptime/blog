# Why Is a vCluster PVC Pending? StorageClass and Provisioner Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Persistent Volume, StorageClass, CSI

Description: Trace a Pending vCluster claim from tenant events through StorageClass filtering to the host CSI provisioner and topology constraints.

---

A `Pending` PersistentVolumeClaim in vCluster can fail at three different layers: the tenant API may reference a StorageClass it cannot see, the vCluster syncer may decline to synchronize the claim because of a StorageClass selector, or the control plane cluster may be unable to provision or bind a volume. Debugging only the tenant object misses most of that path.

This guide targets vCluster **0.36** on shared nodes. PersistentVolumeClaim synchronization is enabled by default. Host-to-tenant StorageClass sync is `auto` by default. With PVC sync enabled and tenant-to-host StorageClass sync disabled, `auto` activates it when virtual or hybrid scheduling is enabled; production platforms should set it explicitly when selectors are part of the storage boundary.

## Start with Tenant Events

In the tenant cluster:

```bash
kubectl get pvc -A
kubectl describe pvc data -n apps
kubectl get storageclass
kubectl get pvc data -n apps \
  -o jsonpath='{.spec.storageClassName}{"\n"}'
```

Events usually identify the first branch:

- `storageclass.storage.k8s.io "fast" not found`: the class is not visible in the tenant. If host-to-tenant StorageClass sync is enabled with a selector, the class may have been filtered or the name may be wrong. If that sync is disabled or has no selector, inspect the host claim because vCluster can pass through a class that exists only on the control plane cluster.
- `did not sync pvc ... because it does not match the selector`: vCluster's `sync.fromHost.storageClasses.selector` prevented the claim from synchronizing.
- `WaitForFirstConsumer`: often expected until a Pod using the claim can be scheduled.
- `no persistent volumes available ... and no storage class is set`: no default class was assigned, or `storageClassName: ""` explicitly disabled dynamic provisioning and requested a classless PV.
- no useful tenant event: locate the translated claim and inspect the host side.

Do not repeatedly delete and recreate a claim while investigating. A provisioner may already have created external storage, and reclaim behavior depends on its StorageClass.

## Check StorageClass Synchronization and Selectors

A deliberate configuration might be:

```yaml
sync:
  toHost:
    persistentVolumeClaims:
      enabled: true
    persistentVolumes:
      enabled: false
  fromHost:
    storageClasses:
      enabled: true
      selector:
        matchLabels:
          platform.example.com/vcluster-access: "approved"
```

On the control plane cluster, inspect the class and label:

```bash
kubectl get storageclass fast -o yaml
kubectl get storageclass fast \
  -o jsonpath='{.metadata.labels.platform\.example\.com/vcluster-access}{"\n"}'
```

Then verify that `fast` appears in the tenant. When host-to-tenant (`sync.fromHost.storageClasses`) StorageClass sync is enabled, vCluster owns tenant StorageClass objects; a class created directly inside the tenant is deleted rather than treated as a valid local definition.

Dynamic provisioning through a selected StorageClass does not require PersistentVolume sync, so the example leaves `sync.toHost.persistentVolumes` disabled. Enable that broader, cluster-scoped path only for a reviewed use case with host admission. The same StorageClass selector filters classes imported host-to-tenant and any PVC/PV synchronization when `storageClassName` names an unselected class. Claims that omit `storageClassName` or set it to `""` are documented exceptions, so use admission as well if your policy requires an explicit approved class.

## Locate the Host Claim

On the control plane cluster, list synchronized PVC candidates by the vCluster management label rather than assuming a translated name:

```bash
kubectl get pvc -A \
  -l vcluster.loft.sh/managed-by

# Replace TRANSLATED_PVC_NAME with the name returned above.
kubectl describe pvc -n team-a-vcluster \
  TRANSLATED_PVC_NAME
```

If there is no host claim, the failure occurred before provisioning. Check sync configuration, selector validation, syncer RBAC, and control plane admission, then read the vCluster pod logs:

```bash
kubectl get pods -n team-a-vcluster
# Replace VCLUSTER_POD_NAME with the name returned above.
kubectl logs -n team-a-vcluster VCLUSTER_POD_NAME -c syncer \
  --since=15m | grep -iE 'pvc|persistentvolume|storageclass|sync'
```

If the host claim exists, its events from the persistent-volume controller and external provisioner are authoritative for binding and provisioning. Inspect the consuming Pod for scheduling, attach, and mount failures.

## Check the Real Provisioner

Inspect the selected StorageClass:

```bash
kubectl get storageclass fast \
  -o custom-columns='NAME:.metadata.name,PROVISIONER:.provisioner,BINDING:.volumeBindingMode,RECLAIM:.reclaimPolicy'
kubectl get csidriver
```

For dynamic provisioning, the `provisioner` must correspond to a healthy controller installed in the control plane cluster. Find it by its documented namespace and labels, then read its logs. For example, an EBS class normally uses `ebs.csi.aws.com`; the in-tree AWS EBS driver was removed in Kubernetes 1.27, while Kubernetes 1.36 retains the deprecated `awsElasticBlockStore` API for compatibility and redirects its operations to the EBS CSI driver.

Common host-side causes include:

- CSI controller Pods are absent, crash-looping, or forbidden by RBAC.
- The cloud identity lacks permission to create, tag, or describe volumes. Missing attach permission surfaces later as a Pod attach failure.
- A quota, capacity limit, or invalid StorageClass parameter rejects provisioning.
- With `WaitForFirstConsumer`, `allowedTopologies` has no overlap with the topology of any node eligible for the consuming Pod.
- `WaitForFirstConsumer` has no consuming Pod yet.
- The consuming Pod cannot schedule because of node selectors, taints, resources, or affinity.
- A Pod sets `spec.nodeName` with `WaitForFirstConsumer`; Kubernetes warns that this bypasses the scheduler and can leave the PVC Pending. Use a node selector instead.

## Inspect Claim Selectors and Static Binding

A PVC `spec.selector` selects pre-existing PV labels. Kubernetes does not dynamically provision a volume for a claim with a non-empty selector. Inspect it explicitly:

```bash
kubectl get pvc data -n apps \
  -o jsonpath='{.spec.selector}{"\n"}'
```

If the application expected dynamic provisioning, remove the selector from the workload manifest and recreate the claim only after confirming it has never bound and no external asset needs cleanup. If static binding was intentional, ensure an `Available` PV has labels matching the selector and compatible capacity, access modes, volume mode, and class. Its node affinity must also allow at least one node eligible for the consuming Pod.

## Verify the Fix End to End

After correcting the actual layer, watch both claims:

```bash
# Tenant context
kubectl get pvc data -n apps --watch

# Control-plane context, in another terminal
kubectl get pvc TRANSLATED_PVC_NAME -n team-a-vcluster --watch
```

Then confirm the consuming Pod schedules and mounts the volume. `Bound` proves that Kubernetes associated the claim with a PV; it does not prove the node can attach and mount the device. Pod events expose attach, mount, filesystem, and topology failures that occur later.

## Official Documentation

- [vCluster: Sync StorageClasses from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/storage-classes)
- [vCluster: PersistentVolumeClaim sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/storage/persistent-volume-claims)
- [Kubernetes: Persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Dynamic volume provisioning](https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/)

## Conclusion

Follow a Pending claim across the tenant API, vCluster selector, translated host object, StorageClass, scheduler, and CSI controller. Tenant events identify skipped synchronization; host claim and Pod events identify provisioning and topology failures. Treat `WaitForFirstConsumer` as a scheduling clue, not automatically as an error.
