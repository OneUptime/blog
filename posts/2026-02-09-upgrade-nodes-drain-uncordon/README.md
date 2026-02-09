# How to Upgrade Kubernetes Cluster Nodes One at a Time with Drain and Uncordon

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Upgrades, Cluster Administration

Description: Learn how to perform rolling upgrades of Kubernetes cluster nodes with minimal downtime using drain and uncordon operations, ensuring pod migration and service continuity during maintenance.

---

Upgrading Kubernetes nodes requires careful orchestration to maintain service availability. The drain and uncordon workflow safely migrates workloads off a node, performs the upgrade, and returns the node to service. This rolling upgrade approach enables zero-downtime cluster upgrades by processing one node at a time while ensuring pod availability.

This guide demonstrates how to upgrade cluster nodes using drain and uncordon for safe, controlled upgrades.

## Understanding Drain and Uncordon

**Drain**: Safely evict all pods from a node and mark it unschedulable
- Cordon: Mark node as unschedulable (no new pods)
- Evict: Gracefully terminate existing pods
- Migrate: Scheduler places pods on other nodes

**Uncordon**: Mark node as schedulable again
- Allows new pods to be scheduled
- Node rejoins available capacity pool

## Pre-Upgrade Checklist

Before starting upgrades:

```bash
# 1. Check cluster health
kubectl get nodes
kubectl get pods --all-namespaces

# 2. Verify cluster version
kubectl version --short

# 3. Check upgrade path (must upgrade one minor version at a time)
# 1.26 -> 1.27 -> 1.28 (valid)
# 1.26 -> 1.28 (invalid, skip 1.27)

# 4. Backup cluster state
# Backup etcd (if you have access)
# Backup important workloads

# 5. Review release notes
# Check breaking changes and deprecated features

# 6. Test in staging environment
```

## Upgrading Control Plane Nodes

Upgrade control plane nodes first, one at a time:

### Step 1: Drain First Control Plane Node

```bash
# Mark node as unschedulable and evict pods
kubectl drain control-plane-1 \
  --ignore-daemonsets \
  --delete-emptydir-data

# Expected output:
# node/control-plane-1 cordoned
# evicting pod kube-system/coredns-xxx
# evicting pod default/nginx-xxx
# pod/coredns-xxx evicted
# pod/nginx-xxx evicted
# node/control-plane-1 drained

# Verify node is cordoned
kubectl get nodes
# control-plane-1   Ready,SchedulingDisabled   control-plane   10d   v1.27.0
```

### Step 2: Upgrade kubeadm

On the drained node:

```bash
# SSH to control-plane-1
ssh control-plane-1

# Find available kubeadm versions
sudo apt-cache madison kubeadm | grep 1.28

# Unhold kubeadm package
sudo apt-mark unhold kubeadm

# Upgrade kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.28.0-00

# Hold kubeadm at new version
sudo apt-mark hold kubeadm

# Verify version
kubeadm version
```

### Step 3: Upgrade Control Plane

```bash
# Plan the upgrade
sudo kubeadm upgrade plan

# Apply upgrade (only on first control plane node)
sudo kubeadm upgrade apply v1.28.0

# For additional control plane nodes, use:
# sudo kubeadm upgrade node
```

### Step 4: Upgrade kubelet and kubectl

```bash
# Unhold packages
sudo apt-mark unhold kubelet kubectl

# Upgrade packages
sudo apt-get update
sudo apt-get install -y kubelet=1.28.0-00 kubectl=1.28.0-00

# Hold packages
sudo apt-mark hold kubelet kubectl

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# Verify
sudo systemctl status kubelet
kubectl version --short
```

### Step 5: Uncordon Node

```bash
# Return to control plane with kubectl access
# Mark node as schedulable
kubectl uncordon control-plane-1

# Verify node is ready and schedulable
kubectl get nodes
# control-plane-1   Ready    control-plane   10d   v1.28.0

# Check pods are running
kubectl get pods --all-namespaces -o wide | grep control-plane-1
```

### Step 6: Repeat for Other Control Plane Nodes

Repeat steps 1-5 for each remaining control plane node, one at a time.

## Upgrading Worker Nodes

After all control plane nodes are upgraded, upgrade workers:

### Drain Worker Node

```bash
# Drain worker-1
kubectl drain worker-1 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s

# Monitor pod migration
kubectl get pods --all-namespaces -o wide --watch
```

### Upgrade Worker Node

On the worker node:

```bash
# SSH to worker-1
ssh worker-1

# Upgrade kubeadm
sudo apt-mark unhold kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.28.0-00
sudo apt-mark hold kubeadm

# Upgrade node configuration
sudo kubeadm upgrade node

# Upgrade kubelet and kubectl
sudo apt-mark unhold kubelet kubectl
sudo apt-get install -y kubelet=1.28.0-00 kubectl=1.28.0-00
sudo apt-mark hold kubelet kubectl

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

### Uncordon Worker Node

```bash
# Mark node schedulable
kubectl uncordon worker-1

# Verify
kubectl get nodes
kubectl get pods --all-namespaces -o wide | grep worker-1
```

## Handling Drain Issues

### Pods with PodDisruptionBudgets

If drain fails due to PDB:

```bash
# Check which PDBs are blocking
kubectl get pdb --all-namespaces

# Check PDB status
kubectl describe pdb <pdb-name> -n <namespace>

# Temporarily adjust PDB (if safe)
kubectl patch pdb <pdb-name> -n <namespace> -p '{"spec":{"minAvailable":0}}'

# Or delete PDB temporarily
kubectl delete pdb <pdb-name> -n <namespace>

# After drain completes, restore PDB
kubectl apply -f original-pdb.yaml
```

### StatefulSet Pods

StatefulSet pods need careful handling:

```bash
# Drain with longer timeout
kubectl drain worker-1 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=600s

# For stateful workloads, verify data is replicated
kubectl get pvc --all-namespaces
```

### Local Storage

Pods using local storage require special attention:

```bash
# Check for local storage
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.volumes[]? | .hostPath or .emptyDir) | .metadata.name'

# Delete emptyDir data (--delete-emptydir-data flag does this)
# For hostPath volumes, ensure data is backed up or replicated
```

### Stuck Pods

Force delete pods that won't terminate:

```bash
# Check pods stuck in Terminating
kubectl get pods --all-namespaces | grep Terminating

# Force delete
kubectl delete pod <pod-name> -n <namespace> --grace-period=0 --force

# For multiple stuck pods
kubectl get pods --all-namespaces | grep Terminating | \
  awk '{print $2, $1}' | \
  while read pod ns; do kubectl delete pod $pod -n $ns --grace-period=0 --force; done
```

## Automated Upgrade Script

Create a script to automate worker upgrades:

```bash
#!/bin/bash
# upgrade-worker-node.sh

NODE=$1
VERSION=$2

if [ -z "$NODE" ] || [ -z "$VERSION" ]; then
  echo "Usage: $0 <node-name> <kubernetes-version>"
  echo "Example: $0 worker-1 1.28.0"
  exit 1
fi

set -e

echo "=== Draining $NODE ==="
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --timeout=300s

echo "=== Upgrading $NODE to $VERSION ==="
ssh $NODE << EOF
  sudo apt-mark unhold kubeadm kubelet kubectl
  sudo apt-get update
  sudo apt-get install -y kubeadm=${VERSION}-00 kubelet=${VERSION}-00 kubectl=${VERSION}-00
  sudo apt-mark hold kubeadm kubelet kubectl
  sudo kubeadm upgrade node
  sudo systemctl daemon-reload
  sudo systemctl restart kubelet
EOF

echo "=== Uncordoning $NODE ==="
kubectl uncordon $NODE

echo "=== Verifying $NODE ==="
kubectl get node $NODE
kubectl wait --for=condition=Ready node/$NODE --timeout=120s

echo "=== Upgrade complete for $NODE ==="
```

Usage:

```bash
chmod +x upgrade-worker-node.sh
./upgrade-worker-node.sh worker-1 1.28.0
```

## Monitoring Upgrade Progress

Track upgrade status:

```bash
# Monitor node versions
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion

# Watch pod distribution
kubectl get pods --all-namespaces -o wide --sort-by=.spec.nodeName

# Check cluster health
kubectl get componentstatuses
kubectl get pods -n kube-system

# Verify control plane
kubectl get pods -n kube-system -l tier=control-plane
```

Create a dashboard script:

```bash
#!/bin/bash
# upgrade-status.sh

echo "=== Node Versions ==="
kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[-1].type,VERSION:.status.nodeInfo.kubeletVersion

echo -e "\n=== Pod Distribution ==="
for node in $(kubectl get nodes -o name | cut -d'/' -f2); do
  count=$(kubectl get pods --all-namespaces --field-selector spec.nodeName=$node --no-headers | wc -l)
  echo "$node: $count pods"
done

echo -e "\n=== Cordoned Nodes ==="
kubectl get nodes | grep SchedulingDisabled || echo "None"

echo -e "\n=== Recent Events ==="
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -10
```

## Rollback Procedure

If upgrade fails:

```bash
# On control plane, rollback is not supported
# Must restore from backup

# On worker node, downgrade packages
ssh worker-1
sudo apt-mark unhold kubelet kubectl
sudo apt-get install -y kubelet=1.27.0-00 kubectl=1.27.0-00
sudo apt-mark hold kubelet kubectl
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# Uncordon node
kubectl uncordon worker-1
```

## Best Practices for Node Upgrades

1. **Upgrade one node at a time**: Never drain multiple nodes simultaneously

2. **Verify between nodes**: Check cluster health after each node

3. **Monitor pod distribution**: Ensure pods migrate successfully

4. **Respect PodDisruptionBudgets**: Don't override PDBs unless necessary

5. **Use timeouts**: Set reasonable timeouts for drain operations

6. **Test in staging**: Practice upgrade procedure in non-production

7. **Communicate downtime**: Inform users of potential service disruption

8. **Document the process**: Maintain runbooks with node-specific details

## Complete Upgrade Workflow

Full procedure for upgrading cluster:

```bash
# 1. Backup cluster state
# 2. Upgrade control-plane-1
kubectl drain control-plane-1 --ignore-daemonsets --delete-emptydir-data
ssh control-plane-1 "sudo apt-get update && sudo apt-get install -y kubeadm=1.28.0-00"
ssh control-plane-1 "sudo kubeadm upgrade apply v1.28.0"
ssh control-plane-1 "sudo apt-get install -y kubelet=1.28.0-00 kubectl=1.28.0-00"
ssh control-plane-1 "sudo systemctl restart kubelet"
kubectl uncordon control-plane-1

# 3. Repeat for control-plane-2 and control-plane-3 (if HA)

# 4. Upgrade each worker node
for node in worker-1 worker-2 worker-3; do
  ./upgrade-worker-node.sh $node 1.28.0
  sleep 60  # Wait between nodes
done

# 5. Verify all nodes upgraded
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion

# 6. Verify cluster health
kubectl get pods --all-namespaces
kubectl get componentstatuses
```

Safely upgrading Kubernetes nodes requires careful use of drain and uncordon operations to migrate workloads without service disruption. Upgrade nodes one at a time, verify cluster health between upgrades, respect PodDisruptionBudgets, and maintain detailed runbooks for your specific cluster topology and workload requirements.
