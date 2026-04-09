# How to Set Up Rook-Ceph Example Configurations for Bare Metal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Bare Metal, Kubernetes, Storage Configuration

Description: Learn how to configure Rook-Ceph for bare metal Kubernetes clusters using raw block devices, node selectors, and production-ready storage settings.

---

## Bare Metal vs Cloud Deployments

Bare metal Rook-Ceph deployments use physical disks directly attached to Kubernetes nodes. This provides the best performance but requires more careful configuration because:
- Disks must be identified by device name, path, or selector
- Node placement matters for data locality
- No cloud-provided storage classes are available as fallback
- Hardware failure planning is the operator's responsibility

## Prerequisites

```bash
# Verify nodes have raw (unused) block devices
for node in $(kubectl get nodes -o name | cut -d/ -f2); do
  echo "=== $node ==="
  kubectl debug -it --image=busybox node/$node -- chroot /host lsblk -d -o NAME,SIZE,TYPE,MOUNTPOINT | grep disk
done

# Disks must have no partitions, no filesystems, no LVM
# A disk with existing data will NOT be used by Rook
```

## Minimal Bare Metal Cluster Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 2
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]"  # All /dev/sdb and above, excluding sda (OS disk)
```

## Production Bare Metal Configuration

For production, use explicit node and device specifications:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 2
    modules:
      - name: pg_autoscaler
        enabled: true
  dashboard:
    enabled: true
    ssl: false
  monitoring:
    enabled: true
  network:
    provider: host  # Use host networking for performance on bare metal
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: "storage-node-1"
        devices:
          - name: "sdb"
          - name: "sdc"
          - name: "sdd"
      - name: "storage-node-2"
        devices:
          - name: "sdb"
          - name: "sdc"
          - name: "sdd"
      - name: "storage-node-3"
        devices:
          - name: "sdb"
          - name: "sdc"
          - name: "sdd"
  placement:
    all:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: role
                  operator: In
                  values:
                    - storage-node
  resources:
    mgr:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "1"
        memory: "1Gi"
    mon:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1"
        memory: "2Gi"
    osd:
      requests:
        cpu: "1"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
```

## Labeling Storage Nodes

```bash
# Label dedicated storage nodes
kubectl label node storage-node-1 role=storage-node
kubectl label node storage-node-2 role=storage-node
kubectl label node storage-node-3 role=storage-node

# Taint to prevent non-storage workloads
kubectl taint node storage-node-1 storage=ceph:NoSchedule
kubectl taint node storage-node-2 storage=ceph:NoSchedule
kubectl taint node storage-node-3 storage=ceph:NoSchedule
```

Update the CephCluster tolerations:

```yaml
  placement:
    all:
      tolerations:
        - key: storage
          operator: Equal
          value: ceph
          effect: NoSchedule
```

## Device Selection Strategies

### By Device Name Filter

```yaml
storage:
  deviceFilter: "^nvme[0-9]n[0-9]"  # Match all NVMe devices
```

### By Device Path

```yaml
storage:
  nodes:
    - name: "storage-node-1"
      devices:
        - name: "/dev/disk/by-id/wwn-0x500a0751265ee7b0"
        - name: "/dev/disk/by-id/wwn-0x500a0751265ee7b1"
```

Using `by-id` paths is more reliable than device names (sdb/sdc), which can change between reboots.

## Host Networking for Performance

On bare metal, host networking eliminates container network overhead:

```yaml
spec:
  network:
    provider: host
```

With host networking, Ceph daemons bind directly to the node's IP, reducing latency for storage traffic.

## Verify the Configuration

```bash
# Deploy the cluster
kubectl apply -f cluster.yaml

# Monitor OSD pod creation
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -w

# Check cluster health
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

```text
ID  CLASS  WEIGHT   TYPE NAME
-1         3.63998  root default
-3         1.21332      host storage-node-1
 0    hdd  0.40399          osd.0
 1    hdd  0.40399          osd.1
 2    hdd  0.40399          osd.2
```

## Summary

Bare metal Rook-Ceph deployments use raw block devices directly attached to Kubernetes nodes. Specify devices explicitly using node-level device lists or device filters, label and taint dedicated storage nodes to isolate workloads, use `by-id` device paths for stability across reboots, and enable host networking to reduce storage traffic overhead. Production clusters should specify explicit node and device lists rather than `useAllDevices: true` to avoid accidentally claiming OS disks.
