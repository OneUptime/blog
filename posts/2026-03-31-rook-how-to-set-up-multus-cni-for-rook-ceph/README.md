# How to Set Up Multus CNI for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Multus, CNI, Networking, Kubernetes

Description: Learn how to configure Multus CNI for Rook-Ceph to separate Ceph cluster traffic from public traffic using dedicated network interfaces.

---

## Overview

Multus CNI allows Kubernetes pods to have multiple network interfaces. For Rook-Ceph, this enables separating public (client-facing) and cluster (OSD replication) traffic onto dedicated network interfaces, improving performance and security by isolating Ceph internal traffic.

## Prerequisites

- Multus CNI installed in your cluster
- Additional network interfaces available on storage nodes
- NetworkAttachmentDefinition CRDs installed

Verify Multus is installed:

```bash
kubectl get daemonset -n kube-system | grep multus
kubectl get crd networkattachmentdefinitions.k8s.cni.cncf.io
```

## Step 1 - Create NetworkAttachmentDefinitions

Create a NetworkAttachmentDefinition for the Ceph public network (client traffic):

```yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ceph-public-network
  namespace: rook-ceph
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "type": "macvlan",
      "master": "eth1",
      "mode": "bridge",
      "ipam": {
        "type": "whereabouts",
        "range": "10.0.1.0/24",
        "range_start": "10.0.1.100",
        "range_end": "10.0.1.200"
      }
    }
```

Create a NetworkAttachmentDefinition for the Ceph cluster network (OSD replication):

```yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ceph-cluster-network
  namespace: rook-ceph
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "type": "macvlan",
      "master": "eth2",
      "mode": "bridge",
      "ipam": {
        "type": "whereabouts",
        "range": "10.0.2.0/24",
        "range_start": "10.0.2.100",
        "range_end": "10.0.2.200"
      }
    }
```

Apply both definitions:

```bash
kubectl apply -f nad-public.yaml
kubectl apply -f nad-cluster.yaml
```

## Step 2 - Configure the CephCluster for Multus

Update the CephCluster to use the Multus network provider:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.5
  network:
    provider: multus
    selectors:
      public: rook-ceph/ceph-public-network
      cluster: rook-ceph/ceph-cluster-network
    ipFamily: IPv4
    dualStack: false
  storage:
    useAllNodes: true
    useAllDevices: true
```

Apply the configuration:

```bash
kubectl apply -f cephcluster.yaml
```

## Step 3 - Verify Network Attachment

After the operator processes the update, verify that Ceph pods have multiple network interfaces:

```bash
kubectl -n rook-ceph exec -it rook-ceph-osd-0-xxx -- ip addr
```

Expected output showing three interfaces:

```text
1: lo: <LOOPBACK,UP>
2: eth0: <UP>  inet 10.244.0.5/24  (pod network)
3: net1: <UP>  inet 10.0.1.105/24  (ceph public)
4: net2: <UP>  inet 10.0.2.105/24  (ceph cluster)
```

Verify Ceph is using the dedicated networks:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd.0 public_network
```

## Step 4 - Verify Client Access Configuration

The Rook operator automatically manages the `rook-ceph-csi-config` ConfigMap with the correct monitor endpoints for the CSI driver. You do not need to manually edit this ConfigMap - any manual changes will be overwritten by the operator during reconciliation.

Verify that the operator has populated the CSI config with the Multus public network addresses:

```bash
kubectl -n rook-ceph get configmap rook-ceph-csi-config -o jsonpath='{.data.config\.json}' | jq .
```

You should see the monitor addresses from the Multus public network (e.g., addresses in the `10.0.1.0/24` range).

## Verifying Traffic Separation

Monitor network traffic on each interface on a storage node:

```bash
# Watch public network traffic (monitors listen on ports 3300 and 6789)
tcpdump -i eth1 port 3300 or port 6789 -n

# Watch cluster replication traffic (OSDs use port range 6800-7300)
tcpdump -i eth2 portrange 6800-7300 -n
```

## Summary

Setting up Multus CNI for Rook-Ceph involves creating NetworkAttachmentDefinitions for public and cluster networks, then configuring the CephCluster with `network.provider: multus` and the appropriate selectors. Once deployed, Ceph daemons attach to the dedicated network interfaces, separating client traffic from internal OSD replication traffic. This improves performance by preventing replication traffic from competing with client I/O on the primary network.
