# How to Manage Kubernetes Nodes from Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Node, Cluster Management, DevOps

Description: Learn how to view, cordon, drain, and manage Kubernetes nodes using Portainer's node management interface.

## Introduction

Kubernetes node management involves monitoring node health, performing maintenance, and managing node lifecycle. Portainer provides a visual interface for common node operations that would otherwise require kubectl commands. This guide covers node management from Portainer.

## Prerequisites

- Portainer with a Kubernetes environment connected
- Cluster-admin access

## Step 1: View All Nodes

1. Select your Kubernetes environment in Portainer
2. Click **Cluster → Details**

The nodes list shows:

| Column | Description |
|--------|-------------|
| Name | Node hostname |
| Status | Current node status |
| Role | control-plane/worker |
| Conditions | Active conditions such as DiskPressure or MemoryPressure |
| Version | Kubelet version |

To view node usage stats, use the stats icon. Node stats are only available when the metrics API is enabled in Portainer.

## Step 2: Inspect a Node

Click on a node name to inspect details such as:

```text
Node: worker-01
─────────────────────────────────────
Status:             Ready
Availability:       Active
Role:               worker
Created:            2024-01-01T00:00:00Z
Kubelet version:    v1.28.4
Kubernetes API:     https://10.0.0.10:6443

Labels:
  kubernetes.io/hostname: worker-01
  node.kubernetes.io/instance-type: m5.xlarge
  topology.kubernetes.io/zone: us-east-1a

Taints: (none)

Applications running on this node: 12
```

## Step 3: Add Labels to a Node

Labels are used by node selectors and affinity rules:

In Portainer:
1. Click on a node
2. Add or edit key-value pairs in the **Labels** section

Or via CLI:

```bash
# Add labels

kubectl label node worker-01 environment=production
kubectl label node worker-01 disk=ssd
kubectl label node worker-02 gpu=nvidia

# View labels
kubectl get node worker-01 --show-labels

# Remove a label
kubectl label node worker-01 disk-   # The dash removes the label
```

## Step 4: Add Taints to a Node

Taints repel pods from scheduling on a node unless pods have matching tolerations:

```bash
# Taint a node to dedicate it to specific workloads
kubectl taint node gpu-worker-01 dedicated=gpu:NoSchedule

# Taint meanings:
# NoSchedule:       New pods without toleration won't schedule here
# PreferNoSchedule: Try not to schedule here, but not strictly forbidden
# NoExecute:        Remove existing pods and don't schedule new ones

# Remove a taint
kubectl taint node gpu-worker-01 dedicated-
```

Pods that tolerate the taint:

```yaml
spec:
  tolerations:
    - key: dedicated
      operator: Equal
      value: gpu
      effect: NoSchedule
```

## Step 5: Cordon a Node

Cordoning prevents new pods from scheduling on the node but keeps existing pods running:

```bash
# Cordon a node (marks as unschedulable)
kubectl cordon worker-01

# Verify
kubectl get node worker-01
# STATUS: Ready,SchedulingDisabled

# Uncordon when maintenance is done
kubectl uncordon worker-01
```

In Portainer: open the node details page and set **Availability** to **Pause**. Set it back to **Active** when maintenance is done.

## Step 6: Drain a Node

Draining safely migrates all pods off a node before maintenance:

```bash
# Drain a node (evicts all pods, cordons the node)
kubectl drain worker-01 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force

# --ignore-daemonsets: Don't evict DaemonSet pods
# --delete-emptydir-data: OK to delete pods using emptyDir volumes
# --force: Required if the node has unmanaged pods

# Monitor eviction
kubectl get pods -o wide --all-namespaces | grep worker-01

# Perform maintenance...
# Then uncordon
kubectl uncordon worker-01
```

In Portainer: open the node details page and set **Availability** to **Drain**.

## Step 7: Perform a Node OS Update

Safe update process for a Kubernetes node:

```bash
# 1. Drain the node
kubectl drain worker-01 --ignore-daemonsets --delete-emptydir-data

# 2. SSH into the node
ssh user@worker-01

# 3. Update the OS
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y

# 4. If you are also upgrading Kubernetes components,
# follow your distribution's documented upgrade procedure
# before bringing the node back into service

# 5. Reboot if needed
sudo reboot

# 6. Back on the management machine, verify the node is Ready again
kubectl get node worker-01

# 7. Uncordon the node
kubectl uncordon worker-01

# 8. Verify node is schedulable again
kubectl get node worker-01
```

## Step 8: Remove a Node from the Cluster

```bash
# 1. Drain the node
kubectl drain worker-01 --ignore-daemonsets --delete-emptydir-data --force

# 2. On the node being removed, if it was joined with kubeadm
# run kubeadm reset to clean up kubeadm components
sudo kubeadm reset

# 3. Back on the management machine, delete the node from the cluster
kubectl delete node worker-01
```

## Step 9: View Pod Distribution Across Nodes

```bash
# See which pods are on each node
kubectl get pods --all-namespaces \
  -o custom-columns=NODE:.spec.nodeName --no-headers | \
  awk 'NF' | \
  sort | uniq -c | sort -rn

# Output:
# 12 worker-01
# 11 worker-02
# 11 worker-03
# 9  worker-04
```

In Portainer, open **Cluster → Details**, then click a node to see the applications running on it.

## Conclusion

Portainer provides a clear view of Kubernetes node health and simplifies common operations like adding labels and monitoring resource utilization. For maintenance operations like draining and cordoning, use the Portainer interface or kubectl - both achieve the same result. Establish a regular maintenance routine that includes draining nodes before any OS updates or hardware changes to help minimize disruption during maintenance.
