# How to Configure Ceph for Disaggregated Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Disaggregated, Storage, Kubernetes, Architecture

Description: Configure Rook-Ceph as dedicated storage nodes separate from compute in a disaggregated architecture using node labels, taints, and Kubernetes placement rules.

---

## Disaggregated vs. Hyper-Converged

In a disaggregated architecture, storage nodes run only Ceph daemons and compute nodes run only application workloads. This provides predictable performance, simpler capacity management, and independent scaling of compute and storage.

## Label Storage-Dedicated Nodes

```bash
# Label nodes as dedicated storage
kubectl label node storage-01 node-role.kubernetes.io/storage=true
kubectl label node storage-02 node-role.kubernetes.io/storage=true
kubectl label node storage-03 node-role.kubernetes.io/storage=true

# Taint storage nodes so only storage workloads schedule there
kubectl taint node storage-01 storage=ceph:NoSchedule
kubectl taint node storage-02 storage=ceph:NoSchedule
kubectl taint node storage-03 storage=ceph:NoSchedule
```

## Configure Rook to Use Only Storage Nodes

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  placement:
    all:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: node-role.kubernetes.io/storage
                  operator: In
                  values:
                    - "true"
      tolerations:
        - key: storage
          operator: Equal
          value: ceph
          effect: NoSchedule
```

## Prevent Application Pods from Scheduling on Storage Nodes

```yaml
# Add to application workload deployments
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-role.kubernetes.io/storage
                    operator: DoesNotExist
```

## Network Configuration for Disaggregated Setup

```yaml
# Use dedicated storage network with CIDR-based separation
spec:
  network:
    provider: host
    addressRanges:
      public:
        - "10.10.1.0/24"   # Client network (connects to compute nodes)
      cluster:
        - "10.10.2.0/24"   # Storage cluster network (internal replication)
```

## Monitor Network Latency Between Storage and Compute

```bash
# From a compute node, measure latency to storage nodes
for node in storage-01 storage-02 storage-03; do
  echo -n "$node: "
  ping -c 3 $node | grep avg
done

# Ideal: < 1ms latency on the storage network
# > 5ms can cause Ceph timeouts and slow operations
```

## Scale Storage Independently

```bash
# Add a new storage node
kubectl label node storage-04 node-role.kubernetes.io/storage=true
kubectl taint node storage-04 storage=ceph:NoSchedule

# Rook will automatically discover and use the new node
# Monitor OSD addition
watch kubectl get pods -n rook-ceph
```

## Dedicated Storage Resource Classes

```yaml
# Storage class for apps to use the disaggregated storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd-fast
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicated-pool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Summary

Disaggregated Ceph deployments use node labels, taints, and Rook placement configuration to ensure storage daemons run exclusively on dedicated storage nodes. This prevents resource contention with application workloads, simplifies capacity planning, and allows compute and storage to scale independently to match actual demand.
