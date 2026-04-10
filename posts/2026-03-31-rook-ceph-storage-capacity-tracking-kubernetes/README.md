# How to Use Ceph with Kubernetes Storage Capacity Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Storage, Capacity, Scheduling, CSI, Topology

Description: Enable and use Kubernetes CSI storage capacity tracking with Ceph to help the scheduler make smarter Pod placement decisions based on available storage capacity.

---

## What is Kubernetes Storage Capacity Tracking?

Kubernetes 1.21+ introduced CSI Storage Capacity (stable in 1.24) - a mechanism where CSI drivers report available storage capacity per topology zone to the Kubernetes API server. The scheduler uses this information to avoid placing Pods on nodes where the required storage cannot be provisioned.

Without capacity tracking, Pods can be scheduled to nodes only to fail because there is no available storage in that topology zone.

## Enabling Capacity Tracking in Rook

Edit the Rook operator ConfigMap or Helm values to enable storage capacity reporting:

```yaml
# rook-ceph-operator-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  ROOK_CSI_ENABLE_RBD: "true"
  ROOK_CSI_ENABLE_CEPHFS: "true"
  # Enable storage capacity tracking
  CSI_ENABLE_STORAGE_CAPACITY: "true"
```

If using the Rook Helm chart:

```yaml
# values.yaml
csi:
  enableRbdDriver: true
  enableCephfsDriver: true
  storageCapacity: true
```

## Enabling in the CSIDriver Object

The CSIDriver object must have `storageCapacity: true`:

```bash
# Check the current CSIDriver
kubectl get csidriver rook-ceph.rbd.csi.ceph.com -o yaml | grep -A5 spec

# Rook manages this automatically when enabled in the operator config
# Verify it's set
kubectl get csidriver rook-ceph.rbd.csi.ceph.com \
  -o jsonpath='{.spec.storageCapacity}'
```

## Viewing CSIStorageCapacity Objects

Once enabled, Rook's external-provisioner sidecar publishes `CSIStorageCapacity` objects:

```bash
# List capacity objects for RBD
kubectl get csistoragecapacity -n rook-ceph

# Detailed view showing capacity per topology zone
kubectl get csistoragecapacity -n rook-ceph -o yaml
```

Example output shows available capacity per storage class and topology zone:

```yaml
apiVersion: storage.k8s.io/v1
kind: CSIStorageCapacity
metadata:
  name: rbd-replicapool-zone-a
  namespace: rook-ceph
storageClassName: rook-ceph-block
capacity: "9223372036854775807"  # Available bytes
nodeTopology:
  matchLabels:
    topology.kubernetes.io/zone: zone-a
```

## Configuring Topology-Aware StorageClass

For capacity tracking to guide scheduling, the StorageClass should reference topology labels:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  # ... other params
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
  - matchLabelExpressions:
      - key: topology.kubernetes.io/zone
        values:
          - zone-a
          - zone-b
          - zone-c
```

`WaitForFirstConsumer` is critical - it defers volume provisioning until the scheduler selects a node, allowing capacity information to influence placement.

## Verifying Scheduler Behavior

```bash
# Check if a pending PVC is waiting for capacity
kubectl describe pvc my-pvc -n production | grep -i "waiting\|capacity\|topology"

# Check scheduler events
kubectl get events -n production --field-selector reason=FailedScheduling
```

## Summary

Kubernetes CSI storage capacity tracking with Ceph allows the scheduler to make informed Pod placement decisions based on actual available storage. Enabling `storageCapacity: true` in the Rook CSI configuration causes the provisioner to publish `CSIStorageCapacity` objects that the scheduler reads. Combined with `WaitForFirstConsumer` volume binding and topology-aware StorageClasses, this prevents the common failure mode of Pods being stuck unschedulable due to insufficient storage capacity in their zone.
