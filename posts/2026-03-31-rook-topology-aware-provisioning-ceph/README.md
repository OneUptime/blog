# How to Configure Topology-Aware Provisioning with Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Topology, Provisioning, StorageClass, Zone, Rack

Description: Configure topology-aware storage provisioning with Ceph to co-locate pods with their volumes in the same availability zone or rack, reducing network latency and cross-zone traffic.

---

## Why Topology-Aware Provisioning Matters

In multi-zone Kubernetes clusters, placing a Pod in zone-a while its Ceph RBD volume's primary OSD is in zone-b creates unnecessary network latency for every IO operation. Topology-aware provisioning ensures volumes are provisioned in the same topology zone as the Pod that will consume them.

## Labeling Nodes with Topology

Kubernetes nodes should carry topology labels. Cloud providers add these automatically; for on-premises clusters, add them manually:

```bash
# Label nodes with zone and rack topology
kubectl label node node-1 topology.kubernetes.io/zone=zone-a
kubectl label node node-1 topology.kubernetes.io/region=us-east
kubectl label node node-1 topology.rook.io/rack=rack-01
```

## Spreading OSDs Across Topology Zones

Rook automatically builds a topology-aware CRUSH map from the node labels set in the previous step. To also ensure OSD pods are evenly distributed across zones at the Kubernetes scheduling level, set `topologySpreadConstraints` in the CephCluster:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  placement:
    all:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: rook-ceph-osd
```

## Topology-Aware StorageClass

Configure the StorageClass to use `WaitForFirstConsumer` and declare allowed topologies:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-topology
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
  - matchLabelExpressions:
      - key: topology.kubernetes.io/zone
        values:
          - zone-a
          - zone-b
          - zone-c
```

## Enabling Topology in Rook CSI

```yaml
# rook-ceph-operator-config
data:
  CSI_ENABLE_TOPOLOGY: "true"
  CSI_TOPOLOGY_DOMAIN_LABELS: "topology.kubernetes.io/zone,topology.kubernetes.io/region"
```

## Verifying Topology-Aware Placement

```bash
# Create a PVC with the topology-aware StorageClass
kubectl apply -f my-pvc.yaml

# Check that it's in WaitForFirstConsumer state
kubectl get pvc my-pvc -n production
# STATUS: Pending (expected until Pod is scheduled)

# Deploy a Pod - the PVC will provision in the Pod's zone
kubectl apply -f my-pod.yaml

# Verify the PV has topology constraints
kubectl get pv $(kubectl get pvc my-pvc -n production \
  -o jsonpath='{.spec.volumeName}') \
  -o jsonpath='{.spec.nodeAffinity}'
```

## OSD Topology Labels

For fine-grained control, Rook propagates OSD topology labels from node labels:

```bash
# Check OSD topology labels
kubectl get pods -n rook-ceph -l app=rook-ceph-osd -o json | \
  jq '.items[].spec.nodeSelector'
```

## Summary

Topology-aware provisioning with Ceph and Rook ensures that PVCs are provisioned in the same availability zone as the Pods that use them, minimizing cross-zone IO latency and network costs. The key configuration elements are node topology labels, `WaitForFirstConsumer` volume binding mode, topology-aware StorageClasses, and enabling CSI topology in the Rook operator config. This setup is especially important in multi-zone clusters where cross-zone storage IO can significantly degrade application performance.
