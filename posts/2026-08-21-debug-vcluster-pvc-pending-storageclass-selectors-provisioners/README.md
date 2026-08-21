# Why Is a vCluster PVC Pending? StorageClass and Provisioner Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Persistent Volume, StorageClass, CSI

Description: Trace a Pending vCluster claim from tenant events through StorageClass filtering to the host CSI provisioner and topology constraints.

---

A `Pending` PersistentVolumeClaim in vCluster can fail at three different layers: the tenant API may reference a StorageClass it cannot see, the vCluster syncer may reject the claim because of a StorageClass selector, or the control plane cluster's CSI provisioner may be unable to create or bind a volume. Debugging only the tenant object misses most of that path.

This guide targets vCluster **0.36** on shared nodes. PersistentVolumeClaim synchronization is enabled by default. Host-to-tenant StorageClass sync is `auto` by default and becomes active with the virtual scheduler; production platforms should set it explicitly when selectors are part of the storage boundary.

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

- `storageclass.storage.k8s.io "fast" not found`: the class was not imported, was filtered, or the name is wrong.
- `did not sync pvc ... because it does not match the selector`: vCluster's `sync.fromHost.storageClasses.selector` rejected it.
- `WaitForFirstConsumer`: often expected until a Pod using the claim can be scheduled.
- `no persistent volumes available ... and no storage class is set`: no default class was assigned, or `storageClassName: ""` explicitly requested static binding.
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

Then verify that `fast` appears in the tenant. When StorageClass sync is enabled, vCluster owns tenant StorageClass objects; a class created directly inside the tenant is deleted rather than treated as a valid local definition.

Dynamic provisioning through a selected StorageClass does not require PersistentVolume sync, so the example leaves `sync.toHost.persistentVolumes` disabled. Enable that broader, cluster-scoped path only for a reviewed use case with host admission. The same StorageClass selector filters classes imported host-to-tenant and any PVC/PV synchronization when `storageClassName` names an unselected class. Claims with an empty `storageClassName` are an exception documented by vCluster, so use admission as well if your policy must reject static or classless storage.

## Locate the Host Claim

On the control plane cluster, find the synchronized PVC by vCluster labels rather than assuming a translated name:

```bash
kubectl get pvc -A \
  -l vcluster.loft.sh/managed-by

kubectl describe pvc -n team-a-vcluster \
  <translated-pvc-name>
```

If there is no host claim, the problem is in sync configuration, selector validation, or syncer RBAC. Read the vCluster pod logs:

```bash
kubectl get pods -n team-a-vcluster
kubectl logs -n team-a-vcluster <vcluster-pod> \
  --since=15m | grep -iE 'pvc|persistentvolume|storageclass|sync'
```

If the host claim exists, its events come from the real scheduler, external provisioner, and CSI driver and are usually authoritative.

## Check the Real Provisioner

Inspect the selected StorageClass:

```bash
kubectl get storageclass fast \
  -o custom-columns='NAME:.metadata.name,PROVISIONER:.provisioner,BINDING:.volumeBindingMode,RECLAIM:.reclaimPolicy'
kubectl get csidriver
```

The `provisioner` must correspond to a healthy controller installed in the control plane cluster. Find it by its documented namespace and labels, then read its logs. For example, an EBS class normally uses `ebs.csi.aws.com`; the legacy in-tree `awsElasticBlockStore` volume type is not present in Kubernetes 1.36.

Common host-side causes include:

- CSI controller Pods are absent, crash-looping, or forbidden by RBAC.
- The cloud identity lacks permission to create, tag, attach, or describe volumes.
- A quota, capacity limit, or invalid StorageClass parameter rejects provisioning.
- `allowedTopologies` excludes every schedulable node zone.
- `WaitForFirstConsumer` has no consuming Pod yet.
- The consuming Pod cannot schedule because of node selectors, taints, resources, or affinity.
- A Pod sets `spec.nodeName` with `WaitForFirstConsumer`; Kubernetes warns that this bypasses the scheduler and can leave the PVC Pending. Use a node selector instead.

## Inspect Claim Selectors and Static Binding

A PVC `spec.selector` selects pre-existing PV labels. Kubernetes does not dynamically provision a volume for a claim with a non-empty selector. Inspect it explicitly:

```bash
kubectl get pvc data -n apps \
  -o jsonpath='{.spec.selector}{"\n"}'
```

If the application expected dynamic provisioning, remove the selector from the workload manifest and recreate the claim only after confirming it has never bound and no external asset needs cleanup. If static binding was intentional, ensure a matching available PV exists with compatible capacity, access modes, volume mode, class, and node affinity.

## Verify the Fix End to End

After correcting the actual layer, watch both claims:

```bash
# Tenant context
kubectl get pvc data -n apps --watch

# Control-plane context, in another terminal
kubectl get pvc -n team-a-vcluster --watch
```

Then confirm the consuming Pod schedules and mounts the volume. `Bound` proves matching or provisioning; it does not prove the node can attach and mount the device. Pod events expose attach, mount, filesystem, and topology failures that occur later.

## Official Documentation

- [vCluster: Sync StorageClasses from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/storage-classes)
- [vCluster: PersistentVolumeClaim sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/storage/persistent-volume-claims)
- [Kubernetes: Persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Dynamic volume provisioning](https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/)

## Conclusion

Follow a Pending claim across the tenant API, vCluster selector, translated host object, StorageClass, scheduler, and CSI controller. Tenant events identify sync rejection; host events identify real provisioning and topology failures. Treat `WaitForFirstConsumer` as a scheduling clue, not automatically as an error.
