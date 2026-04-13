# How to Set CRUSH Location Labels for CSI in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, CRUSH, ReadAffinity

Description: Configure Kubernetes node labels that map to Ceph CRUSH topology locations so the CSI driver can read from the closest OSD replica for improved locality and throughput.

---

## The Problem: Remote Reads Across Availability Zones

In a multi-zone Kubernetes cluster, a pod running in zone A might read data from an OSD in zone B. This adds cross-zone network latency on every read. Ceph supports reading from the nearest replica, but the CSI driver needs to know the CRUSH topology position of the node it is running on to make this decision.

CRUSH location labels bridge the gap between Kubernetes node labels and Ceph's CRUSH topology hierarchy.

## How CRUSH Location Labels Work

The Rook CSI driver reads specific Kubernetes node labels and translates them into CRUSH location hints. When the CSI node plugin issues a read, it passes the location to Ceph's librados, which then prefers OSDs with matching CRUSH topology attributes.

## Labeling Nodes with CRUSH Topology

Apply standard topology labels to Kubernetes nodes:

```bash
kubectl label node worker-1 topology.kubernetes.io/region=us-east
kubectl label node worker-1 topology.kubernetes.io/zone=us-east-1a

kubectl label node worker-2 topology.kubernetes.io/region=us-east
kubectl label node worker-2 topology.kubernetes.io/zone=us-east-1b
```

You can also use Ceph-specific labels for rack and chassis:

```bash
kubectl label node worker-1 topology.rook.io/rack=rack-01
kubectl label node worker-1 topology.rook.io/chassis=chassis-a
```

## Configuring CSI Read Affinity in the CephCluster CR

Enable read affinity and specify which node labels map to CRUSH topology keys in the CephCluster resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  csi:
    readAffinity:
      enabled: true
      crushLocationLabels:
        - topology.kubernetes.io/region
        - topology.kubernetes.io/zone
        - topology.rook.io/rack
```

The `crushLocationLabels` list specifies which Kubernetes node labels the CSI driver reads to determine the CRUSH topology position of each node.

## How Rook Maps Node Labels to the CRUSH Hierarchy

Rook automatically detects topology labels on Kubernetes nodes during OSD deployment. When a node has labels like `topology.kubernetes.io/zone=us-east-1a` or `topology.rook.io/rack=rack-01`, Rook places the OSD into the corresponding CRUSH map bucket. No additional CephCluster CR configuration is needed for CRUSH placement - the node labels are the source of truth.

Make sure to label your nodes before deploying OSDs, so Rook places them in the correct CRUSH buckets from the start.

## Verifying CRUSH Location Assignment

Check that OSDs have CRUSH location attributes set:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

OSDs should be nested under region, zone, and rack buckets matching your labels.

Verify the CSI driver picks up the node labels:

```bash
kubectl -n rook-ceph logs -l app=csi-rbdplugin -c csi-rbdplugin | grep -i "crush\|locality"
```

## Expected Performance Improvement

Read affinity is most impactful when cross-zone bandwidth is limited or metered. In AWS or GCP, cross-zone traffic incurs additional cost. With CRUSH location labels properly configured, reads stay local to the zone wherever a local replica exists, reducing both latency and egress costs.

## Summary

CRUSH location labels for CSI connect Kubernetes node topology labels to Ceph's CRUSH hierarchy, enabling read affinity. Properly labeling nodes and configuring `spec.csi.readAffinity` in the CephCluster CR ensures the CSI driver routes reads to the nearest OSD replica, reducing latency and cross-zone network cost in multi-zone Rook-Ceph deployments.
