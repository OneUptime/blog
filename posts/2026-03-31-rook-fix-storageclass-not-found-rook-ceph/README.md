# How to Fix StorageClass Not Found with Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, StorageClass, Kubernetes

Description: Learn how to fix the StorageClass not found error with Rook-Ceph by verifying pool creation, StorageClass definitions, and CSI driver registration for successful PVC provisioning.

---

## Identifying the Error

When a PVC references a StorageClass that does not exist or is misconfigured, the PVC stays in `Pending` state:

```bash
kubectl describe pvc my-pvc
```

You may see events like:

```text
Warning  ProvisioningFailed  storageclass.storage.k8s.io "rook-ceph-block" not found
```

or:

```text
Warning  ProvisioningFailed  no volume plugin matched
```

## Step 1: Verify the StorageClass Exists

Check if the StorageClass is created:

```bash
kubectl get storageclass
kubectl get storageclass rook-ceph-block
```

If it is missing, the pool may not have been created yet.

## Step 2: Verify the CephBlockPool Exists

StorageClasses reference a CephBlockPool. Check if it is ready:

```bash
kubectl -n rook-ceph get cephblockpool
```

The pool should show `Ready` phase. If missing, create it:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
```

```bash
kubectl apply -f cephblockpool.yaml
```

## Step 3: Create the StorageClass

After the pool is ready, create the StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
kubectl apply -f storageclass.yaml
```

## Step 4: Verify CSI Secrets Exist

The StorageClass references CSI secrets. Verify they exist:

```bash
kubectl -n rook-ceph get secret rook-csi-rbd-provisioner
kubectl -n rook-ceph get secret rook-csi-rbd-node
```

These secrets are created automatically by the Rook operator when the CephCluster is healthy and CSI drivers are initialized. If they are missing, the operator may not have successfully initialized or the CephCluster may not be in a healthy state.

## Step 5: Check the CSI Provisioner

Even with a valid StorageClass, provisioning fails if the CSI provisioner pod is not running:

```bash
kubectl -n rook-ceph get pods | grep provisioner
kubectl -n rook-ceph logs deploy/csi-rbdplugin-provisioner -c csi-provisioner
```

If the provisioner is failing, see the guide on fixing Rook CSI pods not starting.

## Step 6: Verify the clusterID

The `clusterID` parameter in the StorageClass must match the namespace of your CephCluster:

```bash
# Get the clusterID (namespace of CephCluster)
kubectl -n rook-ceph get cephcluster -o jsonpath='{.items[0].metadata.namespace}'
```

The StorageClass must set `clusterID: rook-ceph` (or whatever namespace your cluster is in).

## Verify Provisioning Works

After fixing the StorageClass and pool configuration, test PVC creation:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-block-pvc
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: rook-ceph-block
  resources:
    requests:
      storage: 1Gi
EOF

kubectl get pvc test-block-pvc
# Should show: Bound
```

## Summary

The StorageClass not found error with Rook-Ceph is resolved by ensuring the CephBlockPool is created and in Ready state, the StorageClass is defined with the correct pool name and clusterID, the required CSI secrets exist in the rook-ceph namespace, and the CSI provisioner pods are running. After creating all required resources, PVC provisioning proceeds automatically.
