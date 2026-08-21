# How to Restrict vCluster Tenants to Approved StorageClasses with Label Selectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, StorageClass, Multi-Tenancy, Policy

Description: Label approved host StorageClasses and use vCluster selectors to control which classes and claims can synchronize.

---

StorageClass names often encode cost, encryption, replication, topology, or performance policy. Letting every tenant use every host class can expose unapproved backends or expensive tiers. vCluster 0.36 can import only host StorageClasses that match a Kubernetes label selector and reject PVC/PV synchronization for classes outside that set.

This guide targets vCluster **0.36** with a container control plane on shared nodes. It uses host-to-tenant StorageClass synchronization, not tenant-created StorageClasses synchronized outward.

## Label the Host Classes

Choose labels that describe an administrative decision, not mutable application metadata. For example:

```bash
kubectl label storageclass encrypted-standard \
  platform.example.com/vcluster-access=approved \
  platform.example.com/storage-tier=standard

kubectl label storageclass encrypted-premium \
  platform.example.com/vcluster-access=approved \
  platform.example.com/storage-tier=premium
```

Do not label a class until you have reviewed its provisioner, parameters, reclaim policy, binding mode, expansion behavior, and topology:

```bash
kubectl get storageclass encrypted-standard -o yaml
kubectl get storageclass encrypted-premium -o yaml
```

The label grants visibility and use through the selector. Protect StorageClass and label mutation with host RBAC and admission so tenant identities cannot approve their own class.

## Configure an Allowlist Selector

For a tenant entitled only to the standard tier:

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
          platform.example.com/vcluster-access: approved
          platform.example.com/storage-tier: standard
```

All `matchLabels` and `matchExpressions` conditions are ANDed. To allow either standard or premium for a different tenant tier, use a set expression:

```yaml
sync:
  fromHost:
    storageClasses:
      enabled: true
      selector:
        matchLabels:
          platform.example.com/vcluster-access: approved
        matchExpressions:
          - key: platform.example.com/storage-tier
            operator: In
            values:
              - standard
              - premium
```

Apply the configuration:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

Dynamic provisioning does not require PersistentVolume synchronization. Keep it disabled unless the platform has a reviewed reason to accept tenant-created cluster-scoped PVs and host admission blocks unsafe volume sources such as `hostPath`.

## Understand the Enforcement Behavior

When `sync.fromHost.storageClasses.enabled` is active:

- Matching host StorageClasses appear read-only in the tenant cluster.
- Tenant-created StorageClass objects are deleted by vCluster.
- A PVC or PV naming a selected class can synchronize to the control plane cluster.
- A PVC or PV naming an unselected class remains in the tenant API, is not synchronized, and receives a `SyncWarning` event.
- Removing a label can remove the class from the tenant, but existing PVCs and PVs are not automatically deleted. They become orphaned and require deliberate cleanup.
- A PVC or PV with empty `storageClassName` is allowed by the selector logic documented by vCluster.

The final point matters: a selector is not a complete admission policy for classless/static storage. If the platform must prohibit empty `storageClassName`, add a validating admission rule in the tenant and/or control plane cluster.

## Test the Positive Path

In the tenant cluster:

```bash
kubectl get storageclass
```

Only the approved class set should appear. Create a claim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: approved-data
  namespace: apps
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: encrypted-standard
  resources:
    requests:
      storage: 5Gi
```

```bash
kubectl create namespace apps
kubectl apply -f approved-pvc.yaml
kubectl describe pvc approved-data -n apps
```

With `WaitForFirstConsumer`, create a Pod that uses the claim before expecting it to bind.

## Test the Denial Path

Use a nonexistent or unapproved host class in a disposable claim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: denied-data
  namespace: apps
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: unencrypted-premium
  resources:
    requests:
      storage: 1Gi
```

```bash
kubectl apply -f denied-pvc.yaml
kubectl describe pvc denied-data -n apps
```

Expect a vCluster `SyncWarning` explaining that the claim did not match `sync.fromHost.storageClasses.selector`. On the control plane cluster, confirm there is no translated claim. Delete the disposable tenant claim after the test.

## Plan Changes Without Stranding Data

Changing the selector is a lifecycle event, not a harmless label cleanup. Before removing approval from a class:

1. Inventory tenant PVCs using that `storageClassName` on both sides.
2. Stop new claims through admission.
3. Migrate or retire workloads according to the CSI driver's documented process.
4. Verify backup and restore.
5. Remove the approval label.
6. Reconcile orphaned objects manually; vCluster intentionally does not delete them.

Do not rename a StorageClass in place; its name is how PVCs request it. Introduce a replacement class and migrate claims.

## Add Defense in Depth

Combine the selector with:

- Host RBAC that reserves StorageClass administration for platform operators.
- Admission that rejects empty or unapproved `storageClassName` values.
- `policies.resourceQuota.quota.requests.storage` and `count/persistentvolumeclaims` limits.
- Cloud and CSI policy for encryption, allowed volume types, snapshots, and topology.
- Monitoring for `SyncWarning`, Pending claims, provisioning errors, and capacity.

The selector controls synchronization; it cannot make an insecure StorageClass secure.

## Official Documentation

- [vCluster: StorageClass synchronization and selectors](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/storage-classes)
- [vCluster: Shared-node security hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening)
- [Kubernetes: Labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes: StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)

## Conclusion

Mark approval on the host StorageClass, select only approved tiers in `vcluster.yaml`, and test both a permitted and denied claim. Treat label removal as a storage migration because vCluster preserves existing claims and volumes. Add admission for classless claims and quota for capacity so the selector forms one layer of a complete storage policy.
