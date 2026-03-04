# How to Upgrade Talos Linux Worker Nodes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Worker Nodes, Upgrade, Pod Disruption, Rolling Updates

Description: Best practices for upgrading Talos Linux worker nodes safely using cordoning, draining, and pod disruption budgets.

---

Worker nodes handle the actual application workloads in your Kubernetes cluster. While upgrading workers is generally less risky than upgrading control plane nodes (no etcd to worry about), a careless approach can still cause application downtime. This guide covers the safest practices for upgrading Talos Linux worker nodes.

## Why Worker Node Upgrades Need Care

When a worker node reboots during an upgrade, every pod on that node stops running. If your application only has one replica and it is on the upgrading node, your users experience downtime. Even with multiple replicas, upgrading too many nodes at once can overwhelm the remaining nodes or violate pod disruption budgets.

## Pre-Upgrade Preparation

### Check Workload Distribution

Before starting, understand how your workloads are distributed across worker nodes:

```bash
# See which pods are running on each worker node
kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=<worker-node>

# Check resource utilization per node
kubectl top nodes

# Make sure the remaining nodes can handle the load
# when one node goes down
```

### Set Up Pod Disruption Budgets

Pod disruption budgets (PDBs) tell Kubernetes how many pods in a deployment can be unavailable at the same time. If you have not set these up already, do it before upgrading:

```yaml
# Example PDB for a web application
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 2  # At least 2 pods must remain running
  selector:
    matchLabels:
      app: web-app
```

```bash
# Apply the PDB
kubectl apply -f pdb.yaml

# Verify PDBs are in place
kubectl get pdb --all-namespaces
```

PDBs protect your applications during the drain phase of the upgrade. Without them, Kubernetes will evict all pods from a node without considering application availability.

### Ensure Sufficient Cluster Capacity

When a worker node goes offline, its pods need somewhere to go. Verify that the remaining nodes have enough capacity:

```bash
# Check allocatable resources across worker nodes
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CPU:.status.allocatable.cpu,\
MEMORY:.status.allocatable.memory

# Check current resource requests
kubectl describe nodes | grep -A 5 "Allocated resources"
```

If your cluster is running close to capacity, consider adding a temporary node before starting the upgrade.

## The Upgrade Process

### Step 1: Cordon the Node

Cordoning marks a node as unschedulable. New pods will not be placed on it, but existing pods continue running.

```bash
# Cordon the worker node
kubectl cordon <worker-node-name>

# Verify the node is cordoned
kubectl get nodes
# The node should show SchedulingDisabled
```

### Step 2: Drain the Node

Draining evicts all pods from the node, respecting PDBs and giving pods time to shut down gracefully:

```bash
# Drain the worker node
kubectl drain <worker-node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=60 \
  --timeout=300s

# --ignore-daemonsets: DaemonSet pods cannot be evicted
# --delete-emptydir-data: Allow eviction of pods using emptyDir
# --grace-period: Give pods 60 seconds to shut down
# --timeout: Fail if drain takes more than 5 minutes
```

Watch the drain progress:

```bash
# In another terminal, watch pods being evicted and rescheduled
kubectl get pods --all-namespaces --watch \
  --field-selector spec.nodeName=<worker-node-name>
```

If the drain gets stuck, it is usually because of a PDB that cannot be satisfied:

```bash
# Check which PDBs are blocking the drain
kubectl get pdb --all-namespaces

# Look for PDBs where ALLOWED DISRUPTIONS is 0
# You may need to scale up the deployment first
```

### Step 3: Upgrade the Node

Once the node is drained, proceed with the Talos upgrade:

```bash
# Upgrade the worker node
talosctl upgrade --nodes <worker-node-ip> \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node to come back
talosctl health --nodes <worker-node-ip> --wait-timeout 10m
```

### Step 4: Verify and Uncordon

After the upgrade, verify the node is healthy and uncordon it:

```bash
# Check the node version
talosctl version --nodes <worker-node-ip>

# Check system services
talosctl services --nodes <worker-node-ip>

# Verify the node is Ready in Kubernetes
kubectl get node <worker-node-name>

# Uncordon the node to allow scheduling
kubectl uncordon <worker-node-name>

# Verify the node is no longer SchedulingDisabled
kubectl get nodes
```

Pods will gradually be scheduled back onto the node as Kubernetes balances the workload.

### Step 5: Move to the Next Node

Wait a few minutes for the cluster to stabilize before upgrading the next worker. Watch for pods reaching Running state on the newly upgraded node:

```bash
# Watch pods being scheduled on the upgraded node
kubectl get pods --all-namespaces --field-selector spec.nodeName=<worker-node-name>
```

## Upgrading Workers in Parallel

If you have many worker nodes, upgrading one at a time can take a long time. You can upgrade multiple workers in parallel if:

- Your cluster has enough remaining capacity
- PDBs allow multiple pods to be down simultaneously
- Your applications can tolerate reduced capacity

```bash
# Cordon and drain multiple nodes
kubectl cordon worker-1 worker-2
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data &
kubectl drain worker-2 --ignore-daemonsets --delete-emptydir-data &
wait

# Upgrade both nodes
talosctl upgrade --nodes <worker-1-ip>,<worker-2-ip> \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

A good rule of thumb is to never upgrade more than 25% of your worker nodes at the same time. This ensures the cluster always has at least 75% capacity available.

## Handling Stateful Workloads

Stateful workloads (databases, message queues, etc.) need extra attention:

```bash
# Check for pods with persistent volumes on the node
kubectl get pods --all-namespaces -o wide \
  --field-selector spec.nodeName=<worker-node-name> | \
  xargs -I {} kubectl get pvc -n {} 2>/dev/null

# For StatefulSets, verify the pod has been rescheduled
# and its PV has been reattached before proceeding
kubectl get pods -l app=my-stateful-app -o wide
kubectl get pv | grep my-stateful-app
```

For workloads using local persistent volumes, the pods can only run on the same node. These pods will wait in Pending state until the node comes back. Factor this into your upgrade planning.

## Automating Worker Node Upgrades

For large clusters, scripting the upgrade process saves time and reduces errors:

```bash
#!/bin/bash
# upgrade-workers.sh

IMAGE="ghcr.io/siderolabs/installer:v1.7.0"
WORKERS=("10.0.0.10" "10.0.0.11" "10.0.0.12" "10.0.0.13" "10.0.0.14")

for worker_ip in "${WORKERS[@]}"; do
    NODE_NAME=$(kubectl get nodes -o wide | grep ${worker_ip} | awk '{print $1}')

    echo "Upgrading ${NODE_NAME} (${worker_ip})"

    # Cordon and drain
    kubectl cordon ${NODE_NAME}
    kubectl drain ${NODE_NAME} --ignore-daemonsets --delete-emptydir-data --timeout=300s

    # Upgrade
    talosctl upgrade --nodes ${worker_ip} --image ${IMAGE}

    # Wait for health
    talosctl health --nodes ${worker_ip} --wait-timeout 10m

    # Uncordon
    kubectl uncordon ${NODE_NAME}

    echo "${NODE_NAME} upgraded successfully"
    echo "Waiting 60 seconds for stabilization..."
    sleep 60
done

echo "All worker nodes upgraded!"
```

## Post-Upgrade Verification

After all workers are upgraded:

```bash
# All workers on the new version
talosctl version --nodes <all-worker-ips>

# All nodes Ready and schedulable
kubectl get nodes

# All application pods running
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# No persistent volume issues
kubectl get pv | grep -v Bound
```

## Summary

Upgrading Talos Linux worker nodes safely is about protecting your workloads during the transition. Cordon and drain each node before upgrading, respect pod disruption budgets, verify health after each node, and do not upgrade too many nodes at once. The process is more forgiving than control plane upgrades, but it still deserves careful execution to avoid application downtime.
