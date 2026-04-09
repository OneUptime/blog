# How to Configure Pod Scheduling Based on Storage Locality in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pod Scheduling, Locality, Topology, CSI, Kubernetes

Description: Configure Kubernetes pod scheduling to prefer nodes with local Ceph OSDs, reducing network I/O and latency for storage-intensive workloads.

---

## Storage Locality in Ceph

By default, Kubernetes schedules pods without considering where Ceph data is stored. A pod can end up on a node that is remote from all three OSD replicas, adding unnecessary network hops. Storage-locality scheduling reduces this by preferring nodes that host relevant OSDs.

## How CSI Topology Works

Rook's CSI driver supports topology awareness through `WaitForFirstConsumer` volume binding mode. When a pod is scheduled, the CSI driver provisions the volume on OSDs near the selected node.

```yaml
# StorageClass with WaitForFirstConsumer
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-local-preferred
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
  - matchLabelExpressions:
      - key: topology.rook.io/rack
        values:
          - rack1
          - rack2
```

## Label Nodes with Topology Information

```bash
# Label nodes with rack/chassis topology
kubectl label node worker-01 topology.rook.io/rack=rack1
kubectl label node worker-02 topology.rook.io/rack=rack1
kubectl label node worker-03 topology.rook.io/rack=rack2
kubectl label node worker-04 topology.rook.io/rack=rack2
```

## Enable CSI Topology in Rook

```yaml
# In the Rook operator ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  CSI_ENABLE_TOPOLOGY: "true"
  CSI_TOPOLOGY_DOMAIN_LABELS: "topology.rook.io/rack"
```

## Use Node Affinity for Storage-Local Scheduling

When using pre-provisioned PVs, use node affinity to prefer nodes near storage:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storage-intensive-app
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 80
              preference:
                matchExpressions:
                  - key: topology.rook.io/rack
                    operator: In
                    values:
                      - rack1   # Where the PV's OSDs live
      containers:
        - name: app
          image: myapp:latest
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: my-pvc
```

## StatefulSet with Locality-Aware PVCs

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        storageClassName: ceph-local-preferred
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
```

## Verify OSD Locality

```bash
# Check which OSDs are on which nodes
kubectl get pods -n rook-ceph -l app=rook-ceph-osd -o wide

# Find which node has the majority of replicas for a specific PG
ceph pg map <pool>.<pg-id>
# Output shows acting OSD set -> look up which nodes those OSDs are on
```

## Summary

Pod scheduling based on storage locality in Rook-Ceph uses a combination of CSI topology, `WaitForFirstConsumer` volume binding mode, and node affinity rules to ensure storage-intensive pods run near their data. This reduces cross-node network traffic for I/O-heavy workloads and can noticeably improve effective throughput for large sequential reads.
