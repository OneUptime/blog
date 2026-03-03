# How to Scale Down a Talos Linux Cluster by Removing Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster Scaling, Node Removal, Kubernetes, Infrastructure

Description: A step-by-step guide to safely scaling down a Talos Linux cluster by removing worker and control plane nodes while maintaining cluster health and workload availability.

---

There are many reasons to scale down a Kubernetes cluster: reducing costs during low-traffic periods, decommissioning old hardware, consolidating workloads after optimization, or simply right-sizing your infrastructure. Removing nodes from a Talos Linux cluster requires careful planning to avoid disrupting running workloads. The process differs between worker nodes and control plane nodes, with control plane removal requiring extra attention to etcd quorum and cluster stability.

This guide walks through the safe removal of both worker and control plane nodes from a Talos Linux cluster.

## Before You Start

Assess the current state of your cluster before removing any nodes.

```bash
# Check current nodes
kubectl get nodes -o wide

# Check resource utilization
kubectl top nodes

# Check running workloads
kubectl get pods -A -o wide | grep <node-to-remove>

# Check persistent volumes on the node
kubectl get pv -o wide

# Verify cluster health
talosctl -n <any-node-ip> health
```

Make sure that removing the node will not leave your cluster without enough capacity to run existing workloads. The remaining nodes must have enough CPU, memory, and storage to absorb the workloads from the removed node.

## Removing Worker Nodes

Worker node removal is the simpler operation. The process involves draining the node, removing it from Kubernetes, and then resetting the Talos installation.

### Step 1: Cordon the Node

Cordoning prevents new pods from being scheduled on the node.

```bash
# Cordon the node to prevent new scheduling
kubectl cordon worker-04

# Verify the node is cordoned
kubectl get nodes | grep worker-04
# worker-04   Ready,SchedulingDisabled   <none>   10d   v1.29.0
```

### Step 2: Drain the Node

Draining evicts all pods from the node, allowing them to be rescheduled on other nodes.

```bash
# Drain the node
kubectl drain worker-04 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=60 \
  --timeout=300s

# This will:
# - Evict all pods (except DaemonSet pods)
# - Respect PodDisruptionBudgets
# - Wait up to 5 minutes for pods to terminate
```

If the drain gets stuck, investigate which pods are blocking.

```bash
# Check which pods are still on the node
kubectl get pods -A --field-selector spec.nodeName=worker-04

# If a pod is stuck, check its events
kubectl describe pod <stuck-pod-name> -n <namespace>

# Force drain if necessary (use with caution)
kubectl drain worker-04 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force \
  --grace-period=30
```

### Step 3: Verify Workloads Migrated

```bash
# Check that pods have been rescheduled
kubectl get pods -A -o wide | grep -v worker-04

# Verify no pods remain on the node (except DaemonSets)
kubectl get pods -A --field-selector spec.nodeName=worker-04
```

### Step 4: Delete the Node from Kubernetes

```bash
# Remove the node object from Kubernetes
kubectl delete node worker-04

# Verify it is gone
kubectl get nodes
```

### Step 5: Reset the Talos Node

Reset the Talos installation on the removed node to clean up the disk and prepare for reuse or decommissioning.

```bash
# Reset the node
talosctl -n <worker-04-ip> reset --graceful

# For a complete wipe (including the system disk)
talosctl -n <worker-04-ip> reset --graceful --system-labels-to-wipe STATE --system-labels-to-wipe EPHEMERAL

# After reset, the node reboots into maintenance mode
# You can power it off or reprovision it
```

## Removing Control Plane Nodes

Removing control plane nodes is more delicate because they run etcd. You must maintain etcd quorum throughout the process.

### Understanding etcd Quorum

etcd requires a majority of members to be available for the cluster to function:

- 3 members: can tolerate 1 failure (need 2 for quorum)
- 5 members: can tolerate 2 failures (need 3 for quorum)
- 7 members: can tolerate 3 failures (need 4 for quorum)

You can safely remove a control plane node only if the remaining members still form a quorum.

### Step 1: Check etcd Health

```bash
# Verify etcd cluster health
talosctl -n <any-cp-ip> etcd members

# Check etcd status
talosctl -n <any-cp-ip> etcd status

# Note the member ID of the node you want to remove
```

### Step 2: Cordon and Drain

```bash
# Cordon the control plane node
kubectl cordon cp-03

# Drain it
kubectl drain cp-03 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=60
```

### Step 3: Remove from etcd

This is the critical step. Remove the node from the etcd cluster before shutting it down.

```bash
# Remove the member from etcd
# Use the member ID from the etcd members list
talosctl -n <any-other-cp-ip> etcd remove-member <member-id>

# Verify the member was removed
talosctl -n <any-other-cp-ip> etcd members

# Check etcd is still healthy
talosctl -n <any-other-cp-ip> etcd status
```

### Step 4: Delete the Node from Kubernetes

```bash
# Remove the node object
kubectl delete node cp-03

# Verify remaining control plane nodes
kubectl get nodes
```

### Step 5: Update Load Balancer

If you have a load balancer in front of the control plane, remove the decommissioned node.

```bash
# Remove cp-03 from your load balancer configuration
# Example for HAProxy:
# Remove: server cp-03 10.0.0.13:6443 check
# Reload: sudo systemctl reload haproxy
```

### Step 6: Reset the Node

```bash
# Reset the Talos installation
talosctl -n <cp-03-ip> reset --graceful

# The node will reboot into maintenance mode
```

### Step 7: Verify Cluster Health

```bash
# Check Kubernetes API is responsive
kubectl cluster-info

# Verify all remaining nodes are healthy
kubectl get nodes

# Check etcd cluster health
talosctl -n <remaining-cp-ip> etcd members
talosctl -n <remaining-cp-ip> etcd status

# Run a health check
talosctl -n <remaining-cp-ip> health
```

## Scaling Down Multiple Worker Nodes

When removing multiple workers, do it sequentially to maintain workload availability.

```bash
#!/bin/bash
# scale-down-workers.sh

NODES_TO_REMOVE=(
  "worker-08"
  "worker-09"
  "worker-10"
)

for node in "${NODES_TO_REMOVE[@]}"; do
  echo "Removing node: ${node}"

  # Cordon
  kubectl cordon ${node}

  # Drain
  echo "Draining ${node}..."
  kubectl drain ${node} \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --grace-period=60 \
    --timeout=300s

  # Wait for pods to be rescheduled
  echo "Waiting for workloads to migrate..."
  sleep 30

  # Verify workloads migrated
  REMAINING=$(kubectl get pods -A --field-selector spec.nodeName=${node} \
    --no-headers 2>/dev/null | wc -l)
  echo "${REMAINING} pods remaining on ${node} (DaemonSets expected)"

  # Delete node
  kubectl delete node ${node}
  echo "${node} removed from Kubernetes"

  # Get the node IP (you would need a mapping)
  # NODE_IP=$(get_ip_for_node ${node})
  # talosctl -n ${NODE_IP} reset --graceful

  echo "---"
done

echo "Scale-down complete."
kubectl get nodes
```

## Handling Persistent Volumes

If the node being removed has local persistent volumes, you need to handle them before removal.

```bash
# Check for PVs on the node
kubectl get pv -o wide | grep worker-04

# If there are local PVs, migrate the data first
# For CSI volumes with replication (like Longhorn), the data is already replicated
# For local volumes, you need to back up the data manually

# Check PVCs bound to PVs on this node
kubectl get pvc -A -o wide
```

For storage solutions with built-in replication (Longhorn, Rook-Ceph, LINSTOR), the data is automatically available on other nodes after the old node is removed.

## Monitoring During Scale-Down

Keep an eye on cluster health throughout the process.

```bash
# Watch node status
kubectl get nodes -w

# Monitor pod scheduling
kubectl get pods -A -w

# Check for any pending pods (might indicate capacity issues)
kubectl get pods -A --field-selector status.phase=Pending

# Monitor resource utilization on remaining nodes
kubectl top nodes
```

## Handling PodDisruptionBudgets

PodDisruptionBudgets (PDBs) may prevent draining if removing a pod would violate the budget.

```bash
# Check existing PDBs
kubectl get pdb -A

# If drain is blocked by a PDB, check which PDB
kubectl describe pdb -A

# You may need to scale up the deployment before draining
kubectl scale deployment my-app --replicas=4

# Then drain will succeed because the PDB is satisfied
kubectl drain worker-04 --ignore-daemonsets --delete-emptydir-data
```

## Post-Scale-Down Verification

After removing nodes, verify everything is working correctly.

```bash
# Full cluster health check
kubectl get nodes
kubectl get pods -A | grep -v Running | grep -v Completed

# Check for any pods stuck in Pending
kubectl get pods -A --field-selector status.phase=Pending

# Verify services are accessible
kubectl get svc -A

# Run a quick smoke test
kubectl run smoke-test --image=nginx --rm -it -- curl -s http://kubernetes.default

# Check cluster events for any issues
kubectl get events --sort-by='.lastTimestamp' -A | tail -20
```

## Conclusion

Scaling down a Talos Linux cluster is a methodical process that prioritizes workload safety and cluster stability. For worker nodes, the process is straightforward - cordon, drain, delete, and reset. For control plane nodes, you need the additional step of removing the etcd member before shutting down the node. Always verify cluster health after each node removal, and take special care with persistent volumes and PodDisruptionBudgets. By following these steps carefully, you can reduce your cluster size without service interruptions or data loss.
