# How to Rename Pools in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Kubernetes, Storage

Description: Learn how to rename Ceph pools in a Rook-managed cluster using the Ceph CLI and how to update dependent Kubernetes resources accordingly.

---

Renaming a Ceph pool is a straightforward operation at the Ceph level but requires careful coordination in a Rook-managed environment because StorageClasses, CephBlockPool CRDs, and CSI secrets reference pools by name.

## Rename a Pool Using the Ceph CLI

Ceph provides a direct command to rename a pool. The rename is instant and does not move data:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool rename <old-name> <new-name>
```

Example:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool rename replicapool replicapool-v2
```

Verify the rename succeeded:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool ls detail | grep replicapool-v2
```

## Considerations Before Renaming

Renaming a pool does not affect the data, but it breaks any references that use the old pool name. In a Rook cluster, these include:

- `CephBlockPool` and `CephFilesystem` CRDs (the `metadata.name` used as pool name)
- StorageClass `parameters.pool` or `parameters.dataPool`
- CSI provisioner and node secrets
- `CephClient` key caps referencing the pool by name
- Monitoring dashboards and alerts using the old pool name

## Update the CephBlockPool CRD

Because Rook names the pool after the `CephBlockPool` resource, the correct approach in Rook is to create a new `CephBlockPool` with the desired name and migrate workloads - direct CLI renaming bypasses Rook's reconciliation loop.

If you rename via CLI, update the Rook CRD by deleting the old resource and creating a new one pointing to the renamed pool. Before deleting the old CephBlockPool CR, ensure the `cleanupPolicy` is not set so that Rook does not delete the underlying pool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool-v2
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
```

## Update the StorageClass

After renaming, update any StorageClass that references the old pool name:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool-v2   # Updated from replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
```

StorageClass `parameters` are immutable, so you must delete and recreate the StorageClass:

```bash
kubectl delete storageclass rook-ceph-block
kubectl apply -f storageclass.yaml
```

Note: Recreating a StorageClass only affects new PVCs. Existing PVCs retain the old pool reference in their PV spec.

## Update CSI Key Caps if Needed

If you use `CephClient` resources with caps referencing the old pool name, update them:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph auth caps client.csi-rbd-provisioner \
  mon 'profile rbd' \
  osd 'profile rbd pool=replicapool-v2'
```

## Verify Everything Works

```bash
# Confirm new pool exists and is healthy
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd pool ls

# Check cluster health
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health detail
```

## Summary

Renaming a Ceph pool with `ceph osd pool rename` is fast and non-destructive, but in Rook clusters it requires updating the `CephBlockPool` CRD, StorageClass references, and any CSI auth caps that mention the old pool name. For minimal disruption, plan the rename during a maintenance window and verify all PVC provisioning works with the new name before retiring the old configuration.
