# How to Set Up Network Fencing via Rook CSI-Addons

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Network Fencing, Csi Addons, Kubernetes, High Availability

Description: Configure network fencing with Rook CSI-Addons to isolate failed nodes and prevent split-brain scenarios in Ceph storage clusters running on Kubernetes.

---

## Overview

Network fencing is a critical safety mechanism that prevents a failed or partitioned node from continuing to write to storage, which could corrupt data. Rook CSI-Addons provides the `NetworkFence` CRD to manage network-level fencing, blocking storage access from specific CIDR ranges when a node failure is detected.

## How Network Fencing Works

When a node fails or becomes unreachable:

1. The fencing controller detects the failure
2. A `NetworkFence` resource is created targeting the node's IP
3. Ceph blocks all I/O from that IP at the storage layer
4. The node's volumes are safely taken over by other nodes
5. When the node recovers, the fence is removed

## Prerequisites

- Rook operator with CSI-Addons enabled
- CSI-Addons controller running in the cluster
- Appropriate RBAC for the fencing controller

## Enable CSI-Addons in Rook

Ensure the CSI-Addons sidecar is enabled by setting `CSI_ENABLE_CSIADDONS` in the Rook operator ConfigMap:

```bash
kubectl patch cm rook-ceph-operator-config -nrook-ceph -p $'data:\n "CSI_ENABLE_CSIADDONS": "true"'
```

## Install the CSI-Addons Operator

```bash
kubectl apply -f https://raw.githubusercontent.com/csi-addons/kubernetes-csi-addons/main/deploy/controller/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/csi-addons/kubernetes-csi-addons/main/deploy/controller/rbac.yaml
kubectl apply -f https://raw.githubusercontent.com/csi-addons/kubernetes-csi-addons/main/deploy/controller/setup-controller.yaml
```

## Create a NetworkFence Resource

To fence a node with IP `192.168.1.50`:

```yaml
apiVersion: csiaddons.openshift.io/v1alpha1
kind: NetworkFence
metadata:
  name: fence-node-192-168-1-50
  namespace: rook-ceph
spec:
  driver: rook-ceph.rbd.csi.ceph.com
  fenceState: Fenced
  cidrs:
    - 192.168.1.50/32
  secret:
    name: rook-csi-rbd-provisioner
    namespace: rook-ceph
  parameters:
    clusterID: rook-ceph
```

Apply to activate fencing:

```bash
kubectl apply -f networkfence.yaml
```

## Check Fencing Status

```bash
kubectl get networkfence fence-node-192-168-1-50 -n rook-ceph -o yaml
```

Check the status fields:

```text
status:
  result: Succeeded
  message: "fencing operation successful"
```

## Verify Fencing at the Ceph Layer

Use the Ceph toolbox to confirm the blacklisted IP:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd blocklist ls
```

The fenced node's IP should appear:

```text
listed 1 entries.
192.168.1.50:0/0 2026-03-31T10:00:00.000000+0000
```

## Remove the Fence (Unfence a Node)

When the node is recovered and safe to allow again, update the fenceState:

```yaml
spec:
  fenceState: Unfenced
```

```bash
kubectl apply -f networkfence.yaml
```

## Automate Fencing with Node Health Monitoring

Integrate with a node health controller that automatically creates `NetworkFence` resources when node conditions indicate failure:

```bash
# Example: fence a node automatically when NotReady for 5 minutes
# This is typically handled by a DR controller like Submariner or RHACM
```

## Summary

Rook CSI-Addons NetworkFence provides Kubernetes-native network fencing by blocking storage I/O at the Ceph layer for specific IP addresses. Create a `NetworkFence` resource with `fenceState: Fenced` to isolate a failed node, verify the blocklist in Ceph, and remove the fence with `fenceState: Unfenced` when the node recovers. This prevents data corruption during node failures and is a key component of automated disaster recovery workflows.
