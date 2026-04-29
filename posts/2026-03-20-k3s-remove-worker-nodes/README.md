# How to Remove Worker Nodes from K3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Cluster Management, DevOps, Linux

Description: Learn how to safely remove worker nodes from a K3s cluster by draining workloads, deleting the node, and cleaning up the agent.

## Introduction

Removing a worker node from a K3s cluster is a two-phase process: first, gracefully migrating workloads off the node using Kubernetes' drain mechanism, then cleaning up the K3s agent from the node itself. Properly following both phases ensures no workload disruption and no stale node entries in your cluster.

## Prerequisites

- `kubectl` configured to communicate with your K3s server
- SSH access to the worker node being removed
- Root/sudo privileges on the worker node

## Step 1: Identify the Node to Remove

```bash
# List all nodes with their status and roles

kubectl get nodes -o wide

# Example output:
# NAME         STATUS   ROLES                  AGE   VERSION
# k3s-server   Ready    control-plane,master   15d   v1.29.3+k3s1
# worker-01    Ready    <none>                 10d   v1.29.3+k3s1
# worker-02    Ready    <none>                 10d   v1.29.3+k3s1

# Check what workloads are running on the target node
kubectl get pods -A --field-selector spec.nodeName=worker-01
```

## Step 2: Cordon the Node

Cordoning prevents new pods from being scheduled on the node:

```bash
# Mark the node as unschedulable
kubectl cordon worker-01

# Verify the node is cordoned
kubectl get node worker-01
# NAME        STATUS                     ROLES    AGE   VERSION
# worker-01   Ready,SchedulingDisabled   <none>   10d   v1.29.3+k3s1
```

## Step 3: Drain the Node

Draining evicts the node's workload pods, allowing controller-managed workloads to reschedule on other nodes:

```bash
# Drain all pods from the node
kubectl drain worker-01 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=120s

# Flags explained:
# --ignore-daemonsets: Skip DaemonSet-managed pods (they run on every node)
# --delete-emptydir-data: Continue even if pods use emptyDir volumes
# --timeout: Time to wait before giving up on the drain
# If drain reports unmanaged pods that you intend to delete, rerun with --force
```

### Handling Drain Failures

If drain fails due to PodDisruptionBudgets:

```bash
# Check for PodDisruptionBudgets blocking the drain
kubectl get pdb -A

# Review the blocking PDB before changing it
kubectl describe pdb <pdb-name> -n <namespace>

# If it is safe for the workload, temporarily relax the PDB
kubectl edit pdb <pdb-name> -n <namespace>

# Retry the drain
kubectl drain worker-01 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=120s

# Restore the original PDB setting afterwards
kubectl edit pdb <pdb-name> -n <namespace>
```

## Step 4: Verify Pods Have Been Rescheduled

Ensure critical workloads are running on other nodes:

```bash
# After a successful drain, only DaemonSet or static pods should remain on the node
kubectl get pods -A -o wide --field-selector spec.nodeName=worker-01

# Verify replacement pods are running on other nodes by checking the NODE column
kubectl get pods -A -o wide
```

## Step 5: Delete the Node from Kubernetes

Remove the node object from the cluster:

```bash
# Delete the node from Kubernetes
kubectl delete node worker-01

# Verify the node is removed
kubectl get nodes
```

## Step 6: Uninstall K3s Agent from the Node

SSH to the removed node and run the uninstall script:

```bash
ssh user@worker-01-ip

# Run the K3s agent uninstall script
/usr/local/bin/k3s-agent-uninstall.sh
```

If the uninstall script is not available, manually remove the agent:

```bash
# Stop and disable the service
systemctl stop k3s-agent
systemctl disable k3s-agent

# Remove service files
rm -f /etc/systemd/system/k3s-agent.service
rm -f /etc/systemd/system/k3s-agent.service.env
systemctl daemon-reload

# Remove binaries, symlinks, and data
rm -f /usr/local/bin/k3s
rm -f /usr/local/bin/kubectl /usr/local/bin/crictl /usr/local/bin/ctr
rm -f /usr/local/bin/k3s-killall.sh
rm -rf /var/lib/rancher/k3s
rm -rf /etc/rancher/k3s
rm -rf /run/k3s
rm -rf /run/flannel
rm -rf /var/lib/kubelet
rm -rf /var/lib/cni
```

## Step 7: Clean Up Network Artifacts

If you used `k3s-agent-uninstall.sh`, it already removes K3s-created interfaces and network rules. For manual cleanup, remove any remaining artifacts:

```bash
# Remove remaining K3s-created interfaces
ip link delete flannel.1 2>/dev/null || true
ip link delete flannel-v6.1 2>/dev/null || true
ip link delete cni0 2>/dev/null || true
ip link delete kube-ipvs0 2>/dev/null || true
ip link delete flannel-wg 2>/dev/null || true
ip link delete flannel-wg-v6 2>/dev/null || true

# Remove K3s-created iptables rules without flushing unrelated rules
iptables-save | grep -v KUBE- | grep -v CNI- | grep -iv flannel | iptables-restore
ip6tables-save | grep -v KUBE- | grep -v CNI- | grep -iv flannel | ip6tables-restore
```

## Step 8: Remove Node Password Entry on Server

K3s stores per-node passwords as Kubernetes secrets. Deleting the node in Step 5 removes the matching secret automatically. You can verify it is gone:

```bash
# No output means the node password secret has already been removed
kubectl -n kube-system get secrets | grep 'worker-01.node-password.k3s'
```

## Step 9: Verify Cluster Health

After removing the node, verify the remaining cluster is healthy:

```bash
# Check remaining nodes are Ready
kubectl get nodes

# Ensure all critical workloads are running
kubectl get deployments -A
kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded

# Check cluster has enough capacity for workloads
# Requires Metrics Server
kubectl top node
kubectl describe nodes | grep -A 4 "Allocated resources"
```

## Automating Node Removal with a Script

```bash
#!/bin/bash
# remove-k3s-node.sh <node-name> <node-ip>
set -euo pipefail

NODE_NAME="$1"
NODE_IP="$2"

echo "Removing node: $NODE_NAME ($NODE_IP)"

# Cordon the node
kubectl cordon "$NODE_NAME"

# Drain the node
kubectl drain "$NODE_NAME" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=120s

# Delete from Kubernetes
kubectl delete node "$NODE_NAME"

# Uninstall K3s from the node
ssh "root@$NODE_IP" "/usr/local/bin/k3s-agent-uninstall.sh"

echo "Node $NODE_NAME successfully removed"
```

## Conclusion

Removing a K3s worker node safely requires draining workloads before deletion to avoid disruption. The drain-delete-uninstall sequence ensures both the Kubernetes control plane and the physical node are cleaned up properly. For production clusters, always verify workload redistribution after removal to ensure your remaining nodes have sufficient capacity to handle the increased load.
