# How to Cordon and Drain Nodes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Node Management

Description: Learn how to cordon and drain Kubernetes nodes using the Rancher UI and kubectl for maintenance operations.

Cordoning and draining nodes are essential operations for Kubernetes cluster maintenance. Cordoning marks a node as unschedulable, preventing new pods from being placed on it. Draining goes further by cordoning the node and evicting the pods that Kubernetes can safely remove from it. This guide shows you how to perform both operations through Rancher and kubectl.

## When to Cordon and Drain

Common scenarios that require cordoning and draining:

- **Node maintenance**: OS updates, kernel patches, hardware repairs
- **Kubernetes upgrades**: Rolling node updates to a new version
- **Node removal**: Preparing a node for decommissioning
- **Troubleshooting**: Isolating a problematic node while investigating
- **Resource rebalancing**: Moving workloads off an overloaded node

## Understanding the Difference

- **Cordon**: Marks the node as `SchedulingDisabled`. Existing pods continue to run, but no new pods will be scheduled on the node.
- **Drain**: Cordons the node AND evicts drainable pods. Workloads managed by controllers such as ReplicaSets, Jobs, and StatefulSets are typically recreated on other available nodes.
- **Uncordon**: Removes the `SchedulingDisabled` status, allowing pods to be scheduled again.

## Cordoning a Node

### Via the Rancher UI

1. Log in to the Rancher UI
2. Navigate to your cluster
3. Go to **Nodes**
4. Find the target node
5. Click the three-dot menu
6. Select **Cordon**

The node status will change to show `Cordoned` or `SchedulingDisabled`.

### Via kubectl

```bash
kubectl cordon <NODE_NAME>
```

Verify the node is cordoned:

```bash
kubectl get node <NODE_NAME>
# NAME          STATUS                     ROLES    AGE   VERSION

# worker-01     Ready,SchedulingDisabled   worker   30d   v1.28.4
```

## Draining a Node

### Via the Rancher UI

1. Navigate to your cluster
2. Go to **Nodes**
3. Click the three-dot menu next to the target node
4. Select **Drain**
5. Configure drain options in the dialog:

| Option | Description |
|--------|-------------|
| Grace Period | Seconds to wait for pod termination |
| Timeout | Maximum seconds for the drain operation |
| Ignore DaemonSets | Skip DaemonSet-managed pods |
| Delete Empty Dir Data | Continue even if pods use `emptyDir` volumes, which deletes that local data |
| Force | Continue even if pods do not declare a controller |

6. Click **Drain**

### Via kubectl

Basic drain:

```bash
kubectl drain <NODE_NAME> --ignore-daemonsets
```

With all common options:

```bash
kubectl drain <NODE_NAME> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=60 \
  --timeout=300s
```

Force drain for stubborn pods:

```bash
kubectl drain <NODE_NAME> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force \
  --grace-period=30
```

## Monitoring the Drain Process

### Watch Pod Evictions

```bash
# Watch pods being evicted from the node
kubectl get pods -A --field-selector spec.nodeName=<NODE_NAME> -w

# Watch pods being rescheduled on other nodes
kubectl get pods -A -o wide -w
```

### Check Drain Progress

```bash
# See events related to the drain
kubectl get events -A --field-selector reason=Evicted --sort-by='.metadata.creationTimestamp'
```

### Verify All Pods Are Evicted

```bash
# Only DaemonSet and mirror pods should remain
kubectl get pods -A --field-selector spec.nodeName=<NODE_NAME>
```

## Handling Drain Failures

### Pod Disruption Budget Violations

If a drain fails due to PDB violations:

```bash
# Check PDBs
kubectl get pdb -A

# See which PDBs are blocking
kubectl get pdb -A -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
MIN-AVAILABLE:.spec.minAvailable,\
MAX-UNAVAILABLE:.spec.maxUnavailable,\
CURRENT:.status.currentHealthy,\
DESIRED:.status.desiredHealthy
```

Solutions:

- Scale up the deployment on other nodes first
- Temporarily adjust the PDB (with caution)
- Wait for replicas to become healthy on other nodes

### Pods with Local Storage

Pods using `emptyDir` volumes will block the drain unless `--delete-emptydir-data` is specified:

```bash
# Find pods with emptyDir
kubectl get pods -A --field-selector spec.nodeName=<NODE_NAME> -o json | \
  jq -r '.items[] | select(any(.spec.volumes[]?; has("emptyDir"))) | "\(.metadata.namespace)/\(.metadata.name)"'
```

### Standalone Pods

Pods that are neither mirror pods nor managed by a ReplicationController, ReplicaSet, DaemonSet, StatefulSet, or Job will block the drain unless `--force` is used:

```bash
# Find standalone pods
kubectl get pods -A --field-selector spec.nodeName=<NODE_NAME> -o json | \
  jq -r '.items[] | select((.metadata.annotations["kubernetes.io/config.mirror"] | not) and (((.metadata.ownerReferences // []) | any(.kind == "ReplicationController" or .kind == "ReplicaSet" or .kind == "DaemonSet" or .kind == "StatefulSet" or .kind == "Job")) | not)) | "\(.metadata.namespace)/\(.metadata.name)"'
```

Note: Force-deleting standalone pods means they will not be rescheduled.

### StatefulSet Pods

StatefulSet pods may take longer to drain because they are rescheduled one at a time:

```bash
# Check StatefulSet status
kubectl get statefulsets -A
```

Ensure the target StatefulSet can tolerate one pod being unavailable.

## Uncordoning a Node

After maintenance is complete, uncordon the node to allow scheduling again.

### Via the Rancher UI

1. Navigate to **Nodes**
2. Click the three-dot menu on the cordoned node
3. Select **Uncordon**

### Via kubectl

```bash
kubectl uncordon <NODE_NAME>
```

Verify:

```bash
kubectl get node <NODE_NAME>
# STATUS should show Ready without SchedulingDisabled
```

## Batch Operations

### Cordon Multiple Nodes

```bash
# Cordon all nodes with a specific label
kubectl get nodes -l maintenance=true --no-headers | \
  awk '{print $1}' | xargs -I{} kubectl cordon {}
```

### Drain Multiple Nodes Sequentially

```bash
#!/bin/bash
NODES=("worker-01" "worker-02" "worker-03")

for NODE in "${NODES[@]}"; do
  echo "Draining $NODE..."
  kubectl drain $NODE \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --timeout=300s

  echo "Performing maintenance on $NODE..."
  # Your maintenance commands here

  echo "Uncordoning $NODE..."
  kubectl uncordon $NODE

  echo "Waiting for node to stabilize..."
  sleep 60
done
```

## Drain Strategies for Different Workloads

### Stateless Applications

Standard drain works well:

```bash
kubectl drain <NODE_NAME> --ignore-daemonsets --delete-emptydir-data
```

### Stateful Applications

Drain carefully with longer grace periods:

```bash
kubectl drain <NODE_NAME> \
  --ignore-daemonsets \
  --grace-period=120 \
  --timeout=600s
```

### Database Pods

For database pods, consider:

1. Triggering a graceful failover first
2. Draining with extended grace period
3. Verifying replication is healthy after drain

### GPU Workloads

GPU workloads may take longer to checkpoint and migrate:

```bash
kubectl drain <NODE_NAME> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=300 \
  --timeout=900s
```

## Best Practices

- Remember that drain already cordons the node; cordon earlier if you want to stop new scheduling before you begin maintenance
- Use appropriate grace periods for your workloads
- Monitor PDB status before draining to predict failures
- Drain one node at a time in a cluster to maintain capacity
- Verify workload health after each drain before proceeding to the next node
- Set up pod disruption budgets for critical applications to protect against overly aggressive draining
- Automate drain and uncordon sequences for regular maintenance windows

## Conclusion

Cordoning and draining are fundamental node maintenance operations in Kubernetes. Rancher provides a convenient UI for these operations, while kubectl gives you finer control over drain behavior. Understanding pod disruption budgets, handling edge cases like standalone pods and local storage, and following a systematic drain process ensures your maintenance operations complete safely without disrupting critical workloads.
