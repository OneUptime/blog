# How to Configure Rook-Ceph for Edge Computing Scenarios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Edge Computing, Kubernetes, Storage, IoT

Description: Learn how to configure Rook-Ceph for resource-constrained edge Kubernetes deployments, including single-node clusters, reduced replication, and optimized resource usage.

---

Edge computing deployments run Kubernetes on resource-constrained hardware far from central data centers. Rook-Ceph can be adapted for edge scenarios by tuning resource requests, reducing replication factors, and using single-node or small cluster configurations.

## Edge vs. Core Ceph Differences

| Aspect | Core Deployment | Edge Deployment |
|--------|----------------|-----------------|
| Nodes | 5+ | 1-3 |
| Replication | 3x | 1-2x |
| Memory per OSD | 4Gi+ | 1Gi |
| Monitors | 3 | 1-3 |
| Use Case | High availability | Local persistence |

## Minimal Rook Deployment for Edge

Configure a minimal CephCluster for edge:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  dataDirHostPath: /var/lib/rook
  mon:
    count: 1
    allowMultiplePerNode: true
  mgr:
    count: 1
  dashboard:
    enabled: false
  monitoring:
    enabled: false
  storage:
    useAllNodes: true
    useAllDevices: true
    config:
      osdsPerDevice: "1"
  resources:
    mon:
      requests:
        cpu: 100m
        memory: 512Mi
      limits:
        cpu: 500m
        memory: 1Gi
    osd:
      requests:
        cpu: 250m
        memory: 1Gi
      limits:
        cpu: "1"
        memory: 2Gi
    mgr:
      requests:
        cpu: 100m
        memory: 256Mi
```

## Single-Node Configuration

For a single-node edge device, allow all daemons on the same node:

```yaml
spec:
  mon:
    count: 1
    allowMultiplePerNode: true
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: edge-node-01
        devices:
          - name: /dev/sdb
```

Create a pool with replication factor of 1 (no redundancy, faster writes):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create edge-data 16 16

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set edge-data size 1

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set edge-data min_size 1
```

## Optimizing Memory for Edge OSDs

BlueStore's memory target can be lowered:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    # Reduce BlueStore cache size for edge
    osd_memory_target = 1073741824
    bluestore_cache_size = 536870912
    [mon]
    # Reduce monitor memory usage
    mon_data_avail_warn = 10
```

## Syncing Edge Data to Central Storage

For edge-to-cloud data sync, use RGW lifecycle policies to replicate to a central cluster:

```bash
# Configure zone replication to central cluster
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
    --rgw-zonegroup=edge-group \
    --rgw-zone=edge-site-01 \
    --endpoints=http://edge-rgw:80

# Set sync policy to push to central
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync policy get
```

## K3s Integration

Rook-Ceph works on K3s (lightweight Kubernetes for edge):

```bash
# Install K3s without Traefik and local-path-provisioner
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik,local-storage" sh -

# Deploy Rook after K3s is ready
kubectl apply -f https://raw.githubusercontent.com/rook/rook/main/deploy/examples/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/main/deploy/examples/common.yaml
kubectl apply -f operator-minimal.yaml
```

## Summary

Rook-Ceph can be adapted for edge computing by reducing monitor count to 1, lowering OSD memory targets, using smaller pools with reduced or no replication, and disabling non-essential components like the dashboard and monitoring. K3s is a common edge Kubernetes distribution that works well with Rook. For edge-to-cloud scenarios, RGW zone replication can synchronize local edge data back to a central Ceph cluster.
