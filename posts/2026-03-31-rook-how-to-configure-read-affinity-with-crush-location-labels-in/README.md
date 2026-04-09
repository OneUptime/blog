# How to Configure Read Affinity with CRUSH Location Labels in Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Read Affinity, CRUSH, Kubernetes, Performance

Description: Configure Rook CSI read affinity using Kubernetes node CRUSH location labels to route RBD reads to the nearest OSD for improved latency and throughput.

---

## Overview

By default, Ceph RBD reads are served by the primary OSD regardless of which Kubernetes node the pod is on. Read affinity allows the CSI driver to route read requests to OSDs located on or near the same node as the pod, reducing network hops and improving read latency. This is especially beneficial in stretched or multi-zone clusters.

## How Read Affinity Works

The Rook CSI driver uses CRUSH location labels on Kubernetes nodes to select a replica that is topologically close to the client. If a replica exists on the local node or in the same rack/zone, reads are served from there instead of going to the primary OSD on a potentially distant node.

## Step 1 - Label Kubernetes Nodes with CRUSH Locations

Label each node with standard Kubernetes topology labels. The ceph-csi driver uses the portion after the `/` in the label name as the CRUSH bucket type, and the label value as the CRUSH bucket name. The `kubernetes.io/hostname` label is typically applied automatically by Kubernetes.

For a multi-zone cluster, add zone labels:

```bash
kubectl label node worker-01 topology.kubernetes.io/zone=zone-a
kubectl label node worker-02 topology.kubernetes.io/zone=zone-a
kubectl label node worker-03 topology.kubernetes.io/zone=zone-b
```

You can also use Rook-specific topology labels for finer-grained placement:

```bash
kubectl label node worker-01 topology.rook.io/rack=rack-01
kubectl label node worker-02 topology.rook.io/rack=rack-01
kubectl label node worker-03 topology.rook.io/rack=rack-02
```

## Step 2 - Enable Read Affinity in the CephCluster CR

The Rook operator manages the CSI ConfigMap (`rook-ceph-csi-config`) automatically. To enable read affinity, patch the CephCluster custom resource:

```bash
kubectl -n rook-ceph patch cephclusters.ceph.rook.io rook-ceph --type merge \
  -p '{"spec":{"csi":{"readAffinity":{"enabled":true,"crushLocationLabels":["topology.kubernetes.io/zone","kubernetes.io/hostname"]}}}}'
```

Or equivalently, add this to your CephCluster YAML spec:

```yaml
spec:
  csi:
    readAffinity:
      enabled: true
      crushLocationLabels:
        - topology.kubernetes.io/zone
        - kubernetes.io/hostname
```

The `crushLocationLabels` array lists the Kubernetes node labels the CSI driver will read to determine CRUSH location. Each label name's suffix (after the `/`) becomes the CRUSH bucket type. For example, `topology.kubernetes.io/zone` maps to the `zone` bucket type.

The operator will update the `rook-ceph-csi-config` ConfigMap with the corresponding `readAffinity` configuration.

## Step 3 - Restart CSI Nodeplugin Pods

The Rook operator typically restarts CSI pods automatically after updating the ConfigMap. If needed, you can manually restart the CSI node plugin DaemonSet:

```bash
kubectl -n rook-ceph rollout restart daemonset/csi-rbdplugin
```

## Step 4 - Verify Read Affinity Configuration

Check the node plugin logs to verify read affinity is active:

```bash
kubectl -n rook-ceph logs daemonset/csi-rbdplugin -c csi-rbdplugin | grep -i "read affinity"
```

Expected log line:

```text
read affinity enabled for cluster rook-ceph with CRUSH location labels [topology.kubernetes.io/zone kubernetes.io/hostname]
```

## Step 5 - Verify OSD CRUSH Location Matches

Ensure OSDs have CRUSH locations that match your node labels:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree
```

The CRUSH tree should reflect the same topology you labeled on the nodes:

```text
ID  CLASS  WEIGHT   TYPE NAME          STATUS  REWEIGHT  PRI-AFF
-1         0.17999  root default
-3         0.05999      zone zone-a
-5         0.05999          host worker-01
 0    hdd  0.01999              osd.0      up   1.00000   1.00000
```

## Performance Considerations

Read affinity works best when:

- Your cluster has replicated pools (not erasure coded)
- The replication factor matches or exceeds the number of zones/hosts
- Network latency between zones/racks is significant
- The Linux kernel is version 5.8 or later (required for the `read_from_replica` KRBD map option)

Monitor OSD latency before and after enabling read affinity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

## Summary

Read affinity in Rook CSI routes RBD reads to topologically close OSDs by matching Kubernetes node topology labels against the Ceph CRUSH map. Label nodes with standard topology labels (such as `topology.kubernetes.io/zone` and `kubernetes.io/hostname`), enable `readAffinity` in the CephCluster CR, and verify the configuration in the CSI node plugin logs. This reduces cross-zone or cross-rack read latency, particularly in multi-zone Kubernetes deployments where pods and their storage replicas may be co-located.
