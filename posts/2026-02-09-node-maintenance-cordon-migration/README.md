# How to Configure Kubernetes Node Maintenance with Cordoning and Graceful Pod Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Node Maintenance, Drain, Cordon

Description: Perform safe node maintenance operations using cordoning and graceful pod migration techniques that minimize service disruption while enabling necessary infrastructure updates and repairs.

---

Nodes require maintenance for OS updates, hardware repairs, capacity adjustments, and other operational needs. Taking nodes offline without proper coordination causes pod disruptions and potential service outages. Kubernetes provides cordoning and draining mechanisms that enable safe node maintenance by gracefully migrating workloads before taking nodes offline.

The challenge is balancing maintenance urgency with service availability. Aggressive draining completes quickly but may violate Pod Disruption Budgets or cause service degradation. Conservative draining takes longer but better protects application availability. Understanding the tools and options available enables making appropriate tradeoffs.

Effective node maintenance requires coordinating multiple systems: marking nodes unschedulable, evicting pods gracefully, respecting disruption budgets, and waiting for workloads to stabilize before proceeding.

## Cordoning Nodes to Prevent New Scheduling

Cordoning marks a node as unschedulable without affecting existing pods. This prevents new workloads from landing on nodes destined for maintenance while existing pods continue running.

```bash
# Cordon a single node
kubectl cordon node-1

# Verify cordon status
kubectl get node node-1
# Shows SchedulingDisabled status

# Check node details
kubectl describe node node-1 | grep Taints
# Shows node.kubernetes.io/unschedulable:NoSchedule
```

Cordoning is useful when you need to investigate issues or prepare for maintenance without immediately disrupting workloads.

Cordon multiple nodes matching criteria:

```bash
# Cordon all nodes in a specific zone
kubectl get nodes -l topology.kubernetes.io/zone=us-east-1a -o name | \
  xargs -I {} kubectl cordon {}

# Cordon nodes with specific version
kubectl get nodes -o json | \
  jq -r '.items[] | select(.status.nodeInfo.kubeletVersion=="v1.27.0") | .metadata.name' | \
  xargs -I {} kubectl cordon {}
```

## Draining Nodes with Graceful Pod Eviction

Draining evicts pods from a node while respecting termination grace periods and Pod Disruption Budgets. This safely migrates workloads to other nodes.

Basic drain operation:

```bash
# Drain a node
kubectl drain node-1 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=60 \
  --timeout=600s
```

Key flags:
- `--ignore-daemonsets`: Ignore DaemonSet pods (cannot be evicted)
- `--delete-emptydir-data`: Delete pods using emptyDir volumes
- `--grace-period=60`: Wait 60s for graceful termination
- `--timeout=600s`: Abort if drain takes longer than 10 minutes

For production workloads, use conservative settings:

```bash
# Drain with extended timeouts
kubectl drain node-1 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=120 \
  --timeout=1800s \
  --pod-selector='tier!=critical'
```

This drains non-critical workloads first with generous timeouts.

## Respecting Pod Disruption Budgets

Pod Disruption Budgets prevent draining from disrupting too many pods simultaneously. Drain operations block when they would violate PDBs.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-service-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-service
```

If draining a node would reduce available api-service pods below 2, the drain blocks until conditions change.

Monitor PDB status during drains:

```bash
# Check PDB status
kubectl get pdb --all-namespaces

# View detailed PDB state
kubectl describe pdb api-service-pdb -n production

# Check which PDBs are blocking drains
kubectl get pdb --all-namespaces -o json | \
  jq -r '.items[] | select(.status.disruptionsAllowed == 0) | "\(.metadata.namespace)/\(.metadata.name)"'
```

If drain is blocked by PDB:

```bash
# Option 1: Scale up to allow disruption
kubectl scale deployment api-service -n production --replicas=5

# Wait for new pods to be ready
kubectl wait --for=condition=ready pod -l app=api-service -n production --timeout=300s

# Retry drain
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Option 2: Temporarily adjust PDB
kubectl patch pdb api-service-pdb -n production -p '{"spec":{"minAvailable":1}}'

# Drain node
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Restore PDB
kubectl patch pdb api-service-pdb -n production -p '{"spec":{"minAvailable":2}}'
```

## Automated Node Maintenance Workflow

Automate safe node maintenance:

```bash
#!/bin/bash
# maintain-node.sh - Safe node maintenance procedure

NODE=$1
TIMEOUT=${2:-1800}

if [ -z "$NODE" ]; then
  echo "Usage: $0 <node-name> [timeout-seconds]"
  exit 1
fi

echo "Starting maintenance for node $NODE"

# Step 1: Cordon node
echo "Cordoning node..."
kubectl cordon $NODE

# Step 2: Check for critical workloads
CRITICAL_PODS=$(kubectl get pods --all-namespaces --field-selector spec.nodeName=$NODE \
  -l tier=critical -o name | wc -l)

if [ $CRITICAL_PODS -gt 0 ]; then
  echo "Warning: $CRITICAL_PODS critical pods on this node"
  read -p "Continue with drain? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    kubectl uncordon $NODE
    exit 1
  fi
fi

# Step 3: Drain node
echo "Draining node..."
kubectl drain $NODE \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=120 \
  --timeout=${TIMEOUT}s

if [ $? -ne 0 ]; then
  echo "Drain failed or timed out"
  read -p "Force drain remaining pods? (yes/no): " FORCE
  if [ "$FORCE" = "yes" ]; then
    kubectl drain $NODE \
      --ignore-daemonsets \
      --delete-emptydir-data \
      --force \
      --grace-period=30
  fi
fi

# Step 4: Verify node is empty
POD_COUNT=$(kubectl get pods --all-namespaces --field-selector spec.nodeName=$NODE \
  --no-headers | grep -v DaemonSet | wc -l)

if [ $POD_COUNT -eq 0 ]; then
  echo "Node successfully drained"
  echo "Node ready for maintenance"
else
  echo "Warning: $POD_COUNT pods still running"
fi

# Step 5: Monitor cluster health
echo "Checking cluster health..."
kubectl top nodes
kubectl get pods --all-namespaces --field-selector status.phase=Pending

echo "Maintenance preparation complete"
echo "After completing maintenance, run: kubectl uncordon $NODE"
```

## Batch Node Maintenance

For maintenance affecting multiple nodes, drain them sequentially with health checks between each:

```bash
#!/bin/bash
# batch-maintenance.sh - Drain multiple nodes safely

NODES="$@"
WAIT_TIME=120

for NODE in $NODES; do
  echo "Processing $NODE..."

  # Cordon node
  kubectl cordon $NODE

  # Wait for load balancers to update
  sleep 30

  # Drain node
  kubectl drain $NODE \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --grace-period=120 \
    --timeout=1800s

  if [ $? -ne 0 ]; then
    echo "Failed to drain $NODE, stopping batch"
    exit 1
  fi

  echo "Successfully drained $NODE"

  # Check cluster health
  PENDING_PODS=$(kubectl get pods --all-namespaces --field-selector status.phase=Pending --no-headers | wc -l)
  if [ $PENDING_PODS -gt 5 ]; then
    echo "Warning: $PENDING_PODS pods pending, pausing maintenance"
    exit 1
  fi

  # Wait for cluster to stabilize
  echo "Waiting ${WAIT_TIME}s for cluster to stabilize..."
  sleep $WAIT_TIME

  # Verify service health
  echo "Checking service health..."
  # Add your health check logic here

  echo "Ready for next node"
done

echo "Batch maintenance complete"
```

## Monitoring Node Draining Operations

Track drain progress and impact:

```promql
# Pods being evicted
rate(kube_pod_status_phase{phase="Failed"}[5m])

# Pending pods (may indicate drain issues)
kube_pod_status_phase{phase="Pending"}

# Nodes cordoned
kube_node_spec_unschedulable
```

Create alerts:

```yaml
groups:
- name: node-maintenance
  rules:
  - alert: NodeDrainStalled
    expr: |
      kube_node_spec_unschedulable == 1
      and
      count by (node) (kube_pod_info{node=~".*"}) > 5
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "Node {{ $labels.node }} drain appears stalled"

  - alert: HighPendingPodsDuringMaintenance
    expr: |
      count(kube_pod_status_phase{phase="Pending"}) > 10
      and
      sum(kube_node_spec_unschedulable) > 0
    labels:
      severity: warning
    annotations:
      summary: "High pending pod count during node maintenance"
```

## Post-Maintenance Node Restoration

After completing maintenance, restore the node:

```bash
# Uncordon node to allow scheduling
kubectl uncordon node-1

# Verify node is ready
kubectl get node node-1

# Monitor pod redistribution
watch kubectl get pods --all-namespaces -o wide | grep node-1

# Check node resource utilization
kubectl top node node-1
```

Node maintenance is a routine operational task that must be performed safely to avoid service disruptions. By using cordoning to prevent new scheduling, draining to gracefully evict workloads, respecting Pod Disruption Budgets, and monitoring health throughout the process, you can maintain cluster infrastructure while preserving application availability. Proper node maintenance procedures are essential for operating reliable production Kubernetes clusters.
