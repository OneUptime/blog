# How to Perform Rolling Node Upgrades with Drain and Uncordon

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Upgrades, Operations

Description: Execute safe rolling worker node upgrades using kubectl drain and uncordon commands, minimizing application disruption through controlled pod evacuation and PodDisruptionBudgets.

---

Rolling node upgrades update worker nodes one at a time while maintaining application availability. The drain operation gracefully evicts pods to other nodes before performing system maintenance, while uncordon makes the node schedulable again after upgrade completion. Proper use of drain, combined with PodDisruptionBudgets and careful timing, ensures zero-downtime upgrades for production workloads.

This guide demonstrates performing rolling node upgrades with drain and uncordon, handling stateful workloads, managing PodDisruptionBudgets, and troubleshooting common evacuation issues.

## Understanding Drain and Uncordon

kubectl drain prepares a node for maintenance by safely evicting all pods. The operation first cordons the node, marking it unschedulable, then terminates pods respecting grace periods and disruption budgets. Pods managed by controllers (Deployments, StatefulSets, DaemonSets) are recreated on other nodes.

Uncordon reverses the cordon operation, making the node schedulable again. New pods can then be scheduled on the upgraded node based on resource availability and pod affinity rules.

The drain operation respects PodDisruptionBudgets to maintain application availability. If draining would violate a PDB, the operation waits or fails, protecting critical services from unavailability.

## Pre-Upgrade Planning

Plan the upgrade sequence and prepare for potential issues.

```bash
# List all nodes and their roles
kubectl get nodes -o wide

# Check node resource utilization
kubectl top nodes

# Identify nodes with critical workloads
kubectl get pods -A -o wide | grep <node-name>

# Review PodDisruptionBudgets
kubectl get pdb -A

# Calculate if cluster has capacity for node evacuation
# Ensure remaining nodes can handle workload
kubectl describe nodes | grep -A 5 "Allocated resources"
```

## Creating PodDisruptionBudgets

Protect critical applications during node upgrades.

```yaml
# frontend-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: frontend-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: frontend
---
# database-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
spec:
  maxUnavailable: 0
  selector:
    matchLabels:
      app: database
---
# api-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  minAvailable: "75%"
  selector:
    matchLabels:
      app: api
```

Apply PDBs before upgrades:

```bash
kubectl apply -f frontend-pdb.yaml
kubectl apply -f database-pdb.yaml
kubectl apply -f api-pdb.yaml

# Verify PDBs
kubectl get pdb -A
kubectl describe pdb frontend-pdb
```

## Draining the First Worker Node

Begin the rolling upgrade process.

```bash
# Cordon the node first to prevent new pods
kubectl cordon worker-01

# Verify node is unschedulable
kubectl get nodes | grep worker-01
# Should show SchedulingDisabled

# Drain the node
kubectl drain worker-01 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force \
  --grace-period=30 \
  --timeout=5m

# Monitor pod migrations
watch "kubectl get pods -A -o wide | grep worker-01"
```

Drain options explained:
- `--ignore-daemonsets`: Allows draining despite DaemonSet pods
- `--delete-emptydir-data`: Deletes pods using emptyDir volumes
- `--force`: Force deletes pods not managed by controllers
- `--grace-period=30`: Gives pods 30 seconds to terminate gracefully
- `--timeout=5m`: Fails drain if not complete in 5 minutes

## Upgrading the Node

Once drained, upgrade the node's Kubernetes components.

```bash
# SSH to the node
ssh worker-01

# Upgrade kubeadm, kubelet, and kubectl
sudo apt-mark unhold kubeadm kubelet kubectl
sudo apt-get update
sudo apt-get install -y \
  kubeadm=1.28.4-00 \
  kubelet=1.28.4-00 \
  kubectl=1.28.4-00
sudo apt-mark hold kubeadm kubelet kubectl

# Upgrade node configuration
sudo kubeadm upgrade node

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# Verify kubelet is running
sudo systemctl status kubelet

# Exit node
exit
```

## Uncordoning the Node

Make the upgraded node schedulable again.

```bash
# Uncordon the node
kubectl uncordon worker-01

# Verify node is schedulable
kubectl get nodes | grep worker-01
# Should show Ready without SchedulingDisabled

# Check node version
kubectl get node worker-01 -o jsonpath='{.status.nodeInfo.kubeletVersion}'

# Monitor pod redistribution
kubectl get pods -A -o wide --field-selector spec.nodeName=worker-01
```

## Handling Drain Failures

Troubleshoot and resolve common drain issues.

```bash
# If drain fails due to PDB
kubectl drain worker-02 --ignore-daemonsets --delete-emptydir-data
# Error: Cannot evict pod as it would violate the pod's disruption budget

# Check which PDB is blocking
kubectl get pdb -A
kubectl describe pdb database-pdb

# Options:
# 1. Wait for pods to become healthy on other nodes
kubectl get pods -l app=database -o wide

# 2. Temporarily adjust PDB (not recommended)
kubectl patch pdb database-pdb -p '{"spec":{"maxUnavailable":1}}'

# 3. Force drain (last resort)
kubectl drain worker-02 --ignore-daemonsets --delete-emptydir-data --disable-eviction

# If drain times out
kubectl drain worker-03 --ignore-daemonsets --delete-emptydir-data --timeout=10m

# If pods are stuck terminating
kubectl get pods -A | grep Terminating
kubectl delete pod <stuck-pod> --force --grace-period=0 -n <namespace>
```

## Rolling Upgrade Automation

Automate the rolling upgrade across all worker nodes.

```bash
#!/bin/bash
# rolling-node-upgrade.sh

set -e

TARGET_VERSION="${1:-1.28.4}"
GRACE_PERIOD="${2:-60}"
DRAIN_TIMEOUT="${3:-10m}"

# Get list of worker nodes
NODES=$(kubectl get nodes -l node-role.kubernetes.io/worker -o jsonpath='{.items[*].metadata.name}')

echo "=== Rolling Node Upgrade to v${TARGET_VERSION} ==="
echo "Nodes to upgrade: $NODES"
echo ""

for NODE in $NODES; do
  echo "==============================================="
  echo "Upgrading node: $NODE"
  echo "==============================================="

  # Cordon node
  echo "[1/5] Cordoning node..."
  kubectl cordon $NODE

  # Drain node
  echo "[2/5] Draining node..."
  kubectl drain $NODE \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --grace-period=$GRACE_PERIOD \
    --timeout=$DRAIN_TIMEOUT

  # Upgrade node (requires SSH access)
  echo "[3/5] Upgrading Kubernetes components..."
  ssh $NODE <<ENDSSH
    sudo apt-mark unhold kubeadm kubelet kubectl
    sudo apt-get update -qq
    sudo apt-get install -y -qq \
      kubeadm=${TARGET_VERSION}-00 \
      kubelet=${TARGET_VERSION}-00 \
      kubectl=${TARGET_VERSION}-00
    sudo apt-mark hold kubeadm kubelet kubectl
    sudo kubeadm upgrade node
    sudo systemctl daemon-reload
    sudo systemctl restart kubelet
ENDSSH

  # Wait for node to be ready
  echo "[4/5] Waiting for node to be ready..."
  kubectl wait --for=condition=ready node/$NODE --timeout=5m

  # Uncordon node
  echo "[5/5] Uncordoning node..."
  kubectl uncordon $NODE

  # Verify version
  VERSION=$(kubectl get node $NODE -o jsonpath='{.status.nodeInfo.kubeletVersion}')
  echo "Node $NODE upgraded to $VERSION"

  # Wait before next node
  echo ""
  echo "Waiting 30 seconds before next node..."
  sleep 30
  echo ""
done

echo "==============================================="
echo "Rolling upgrade complete!"
echo "==============================================="

# Final verification
kubectl get nodes -o wide
```

Run the automated upgrade:

```bash
chmod +x rolling-node-upgrade.sh
./rolling-node-upgrade.sh 1.28.4 60 10m
```

## Handling Stateful Workloads

Special considerations for StatefulSets and databases.

```bash
# For StatefulSets with local storage
# 1. Ensure pod replicas > 1 for redundancy
kubectl scale statefulset database --replicas=3

# 2. Drain node with longer timeout
kubectl drain worker-04 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=300 \
  --timeout=30m

# 3. Wait for StatefulSet pod to recover on new node
kubectl wait --for=condition=ready pod -l app=database --timeout=10m

# For databases with leader election
# 1. Trigger leader transfer before drain (if supported)
kubectl exec database-0 -- pg_promote  # PostgreSQL example

# 2. Drain follower nodes first
kubectl drain worker-04 --ignore-daemonsets --delete-emptydir-data

# 3. Drain leader node last
```

## Monitoring Upgrade Progress

Track upgrade status and application health.

```bash
# Watch node status
watch -n 5 'kubectl get nodes'

# Monitor pod distributions
watch -n 5 'kubectl get pods -A -o wide'

# Check PDB status
kubectl get pdb -A -o wide

# Monitor disruptions
kubectl get events -A --sort-by='.lastTimestamp' | grep -i evict

# Application health checks
kubectl get deployments -A
kubectl get statefulsets -A

# Check for CrashLoopBackOff
kubectl get pods -A | grep -E "CrashLoop|Error|ImagePullBackOff"
```

## Verifying Upgrade Completion

Confirm all nodes upgraded successfully.

```bash
# Verify all nodes at target version
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
VERSION:.status.nodeInfo.kubeletVersion,\
STATUS:.status.conditions[-1].type

# Check for scheduling issues
kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded

# Verify applications are healthy
kubectl get deployments -A -o wide
kubectl get statefulsets -A -o wide

# Run smoke tests
kubectl run smoke-test --image=busybox --rm -it --restart=Never -- \
  wget -qO- http://my-service.default.svc.cluster.local

# Check cluster events
kubectl get events -A --sort-by='.lastTimestamp' | tail -50
```

## Rollback Procedures

If issues arise, rollback node upgrades.

```bash
# Cordon problematic node
kubectl cordon worker-05

# Drain node
kubectl drain worker-05 --ignore-daemonsets --delete-emptydir-data

# SSH to node and downgrade
ssh worker-05
sudo apt-mark unhold kubeadm kubelet kubectl
sudo apt-get install -y --allow-downgrades \
  kubeadm=1.27.8-00 \
  kubelet=1.27.8-00 \
  kubectl=1.27.8-00
sudo apt-mark hold kubeadm kubelet kubectl
sudo kubeadm upgrade node
sudo systemctl daemon-reload
sudo systemctl restart kubelet
exit

# Uncordon node
kubectl uncordon worker-05

# Verify rollback
kubectl get node worker-05 -o jsonpath='{.status.nodeInfo.kubeletVersion}'
```

Rolling node upgrades with drain and uncordon enable zero-downtime Kubernetes cluster maintenance. By respecting PodDisruptionBudgets, gracefully evacuating pods, and upgrading nodes sequentially, you maintain application availability throughout the upgrade process. Automation through scripts ensures consistency across nodes while monitoring and verification procedures confirm successful upgrades before proceeding to the next node.
