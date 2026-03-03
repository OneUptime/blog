# How to Perform Rolling Reboots on Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Rolling Reboots, Cluster Management, DevOps

Description: A practical guide to performing rolling reboots on Talos Linux clusters without disrupting running workloads or losing cluster availability.

---

There are plenty of reasons you might need to reboot nodes in a Talos Linux cluster. Maybe you applied a configuration change that requires a reboot. Maybe a kernel parameter update needs to take effect. Or maybe you just want to clear out some stale state after a long uptime period. Whatever the reason, rebooting all your nodes at once is obviously a bad idea. You need rolling reboots - taking nodes down one at a time while the rest of the cluster keeps running.

Talos Linux makes this straightforward with its API-driven approach, but there are still some important details to get right. This guide covers how to plan and execute rolling reboots safely.

## Understanding Node Reboots in Talos Linux

In Talos Linux, you do not SSH into a machine and run `reboot`. Instead, you use the `talosctl` command to send a reboot request through the Talos API. The node will gracefully shut down its services and restart.

```bash
# Reboot a single node
talosctl reboot -n <node-ip>
```

This triggers a clean shutdown sequence. Talos will stop all services in order, sync filesystems, and then reboot the machine. It is important to understand that this alone is not enough for a safe rolling reboot. You also need to handle workload evacuation through Kubernetes.

## Prerequisites

Before starting a rolling reboot, make sure you have:

- `talosctl` configured with access to all nodes
- `kubectl` configured with cluster admin access
- A healthy cluster (all nodes Ready, etcd healthy)
- Pod Disruption Budgets (PDBs) configured for critical workloads

Verify your starting state:

```bash
# Check all nodes are Ready
kubectl get nodes

# Verify etcd cluster health
talosctl etcd status -n <control-plane-ip>

# Check for any existing pod issues
kubectl get pods --all-namespaces --field-selector=status.phase!=Running,status.phase!=Succeeded
```

## Rolling Reboot Strategy for Worker Nodes

Worker nodes are simpler to handle because they do not run etcd or the Kubernetes control plane components. The process for each worker node is:

1. Cordon the node to prevent new pods from being scheduled
2. Drain the node to evict existing pods
3. Reboot the node
4. Wait for the node to come back and become Ready
5. Uncordon the node

```bash
# Step 1: Cordon the node
kubectl cordon <worker-node-name>

# Step 2: Drain the node
kubectl drain <worker-node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s \
  --grace-period=60

# Step 3: Reboot the node
talosctl reboot -n <worker-node-ip>

# Step 4: Wait for the node to come back
# Poll until the node shows as Ready
kubectl wait --for=condition=Ready node/<worker-node-name> --timeout=600s

# Step 5: Uncordon the node
kubectl uncordon <worker-node-name>
```

Wait for all pods to stabilize on the node before moving to the next one. You can check this with:

```bash
# Wait for all pods on the node to be running
kubectl get pods --all-namespaces --field-selector=spec.nodeName=<worker-node-name>
```

## Rolling Reboot Strategy for Control Plane Nodes

Control plane nodes require extra caution because they run etcd. If you reboot too many control plane nodes at once, you lose quorum and the cluster becomes unavailable.

For a 3-node control plane, you can only have one node down at a time. For a 5-node control plane, you can tolerate two nodes being down, but it is still safer to do one at a time.

```bash
# Before rebooting a control plane node, verify etcd health
talosctl etcd status -n <control-plane-ip>

# Check the etcd member list
talosctl etcd members -n <control-plane-ip>
```

The sequence for each control plane node is:

```bash
# Drain the control plane node
kubectl drain <cp-node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s

# Reboot the node
talosctl reboot -n <cp-node-ip>

# Wait for the node to rejoin
talosctl health -n <cp-node-ip> --wait-timeout 10m

# Verify etcd is healthy with all members
talosctl etcd status -n <another-cp-ip>

# Uncordon the node
kubectl uncordon <cp-node-name>
```

Always verify etcd health after each control plane reboot before moving to the next node.

## Automating Rolling Reboots with a Script

Doing this manually for each node works fine for small clusters, but for larger clusters you will want a script. Here is a Bash script that performs rolling reboots:

```bash
#!/bin/bash
# rolling-reboot.sh
# Performs rolling reboots across a Talos Linux cluster

set -euo pipefail

CONTROL_PLANE_NODES=("10.0.0.1" "10.0.0.2" "10.0.0.3")
WORKER_NODES=("10.0.0.11" "10.0.0.12" "10.0.0.13" "10.0.0.14")

DRAIN_TIMEOUT="300s"
REBOOT_TIMEOUT="600s"
GRACE_PERIOD="60"

get_node_name() {
    local ip=$1
    kubectl get nodes -o wide | grep "$ip" | awk '{print $1}'
}

reboot_node() {
    local ip=$1
    local node_name
    node_name=$(get_node_name "$ip")

    echo "Starting reboot for node: $node_name ($ip)"

    # Cordon and drain
    kubectl cordon "$node_name"
    kubectl drain "$node_name" \
        --ignore-daemonsets \
        --delete-emptydir-data \
        --timeout="$DRAIN_TIMEOUT" \
        --grace-period="$GRACE_PERIOD"

    # Reboot
    talosctl reboot -n "$ip"

    # Wait for the node to come back
    echo "Waiting for $node_name to become Ready..."
    sleep 30  # Give the node time to start rebooting
    kubectl wait --for=condition=Ready node/"$node_name" --timeout="$REBOOT_TIMEOUT"

    # Uncordon
    kubectl uncordon "$node_name"

    echo "Node $node_name ($ip) successfully rebooted"
    echo "---"
}

# Reboot worker nodes first
echo "Starting rolling reboot of worker nodes..."
for ip in "${WORKER_NODES[@]}"; do
    reboot_node "$ip"
    # Brief pause between nodes
    sleep 10
done

# Then reboot control plane nodes
echo "Starting rolling reboot of control plane nodes..."
for ip in "${CONTROL_PLANE_NODES[@]}"; do
    reboot_node "$ip"

    # Verify etcd health after each control plane reboot
    echo "Verifying etcd health..."
    talosctl etcd status -n "${CONTROL_PLANE_NODES[0]}"

    # Longer pause between control plane nodes
    sleep 30
done

echo "Rolling reboot complete!"
```

## Handling Pod Disruption Budgets

Pod Disruption Budgets are your safety net during rolling reboots. They prevent draining a node from disrupting too many pods of a given application at once.

If you have not set up PDBs yet, do so before performing rolling reboots:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
  namespace: default
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

When you run `kubectl drain`, it will respect PDBs. If draining a node would violate a PDB, the drain will wait until it is safe to proceed. If it cannot drain within the timeout, it will fail, and you should investigate before forcing the drain.

## Dealing with Stuck Drains

Sometimes a drain gets stuck because of pods that cannot be evicted. Common causes include:

- PDBs that are too restrictive
- Pods with no owner (standalone pods)
- Pods using local storage with `emptyDir` volumes

If a drain is stuck, check what is blocking it:

```bash
# See which pods are still on the node
kubectl get pods --all-namespaces --field-selector=spec.nodeName=<node-name>

# Check events for eviction failures
kubectl get events --sort-by='.lastTimestamp' | grep -i evict
```

## Monitoring During Rolling Reboots

Keep an eye on cluster health throughout the process. Run these checks between node reboots:

```bash
# Quick health check
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Check resource utilization - remaining nodes may be under pressure
kubectl top nodes
```

If you see pods stuck in Pending state after a reboot, it might mean the remaining nodes do not have enough capacity. In that case, wait for the rebooted node to come back before draining the next one.

## Parallel Worker Reboots

If your cluster has plenty of spare capacity, you can speed things up by rebooting multiple worker nodes in parallel. Just make sure you leave enough capacity to run all your workloads on the remaining nodes.

A reasonable approach is to reboot nodes in batches. For a 20-worker cluster, you might reboot 3-4 workers at a time:

```bash
# Reboot workers in batches of 3
BATCH_SIZE=3
for ((i=0; i<${#WORKER_NODES[@]}; i+=BATCH_SIZE)); do
    batch=("${WORKER_NODES[@]:i:BATCH_SIZE}")
    for ip in "${batch[@]}"; do
        reboot_node "$ip" &
    done
    wait  # Wait for the batch to complete
    sleep 30
done
```

## Conclusion

Rolling reboots on Talos Linux clusters follow a predictable pattern: drain, reboot, verify, uncordon. The API-driven nature of Talos makes the reboot step clean and reliable. The key is to handle the Kubernetes side properly - draining nodes, respecting PDBs, and verifying health between reboots. With a good script and proper PDBs in place, rolling reboots become a routine operation that you can run with confidence.
