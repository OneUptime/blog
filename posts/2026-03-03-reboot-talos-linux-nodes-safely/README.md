# How to Reboot Talos Linux Nodes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Node Reboot, Maintenance, Cluster Operations

Description: A practical guide to safely rebooting Talos Linux nodes without disrupting cluster workloads or losing availability.

---

Rebooting nodes is one of the most common maintenance tasks in any Kubernetes cluster. Whether you are applying system updates, troubleshooting issues, or performing routine maintenance, knowing how to reboot Talos Linux nodes without disrupting your workloads is essential. This guide walks through the process from preparation to verification.

## Why Reboot Talos Linux Nodes?

There are several scenarios where a node reboot is necessary:

- After applying a new machine configuration that requires a reboot
- When a kernel update has been applied through a Talos upgrade
- If a node is experiencing issues that a restart might resolve (memory leaks in system processes, for example)
- During scheduled maintenance windows

The good news is that Talos Linux is designed with reboots in mind. Its immutable, API-driven nature means reboots are clean and predictable.

## The Basic Reboot Command

The simplest way to reboot a Talos node is:

```bash
# Reboot a single node
talosctl reboot --nodes <node-ip>
```

However, just running this command without preparation can disrupt workloads. Let us look at the proper procedure.

## Step 1: Check Cluster State

Before rebooting anything, verify the current state of your cluster:

```bash
# Check all nodes are healthy
kubectl get nodes

# Verify no ongoing deployments or rollouts
kubectl get deployments --all-namespaces | grep -v "1/1\|2/2\|3/3"

# Check for any existing disruptions
kubectl get pdb --all-namespaces
```

If there are already unhealthy nodes or ongoing rollouts, it is better to wait before adding another reboot to the mix.

## Step 2: Cordon the Node

Prevent new pods from being scheduled on the node:

```bash
# Mark the node as unschedulable
kubectl cordon <node-name>
```

Verify the node is cordoned:

```bash
# The node should show SchedulingDisabled
kubectl get nodes
```

## Step 3: Drain the Node

Evict all pods from the node gracefully:

```bash
# Drain the node, giving pods time to terminate cleanly
kubectl drain <node-name> \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --timeout=300s
```

The `--timeout=300s` flag gives pods up to five minutes to terminate. Adjust this based on your workloads. Some applications need more time for graceful shutdown.

If a drain gets stuck, check which pods are preventing it:

```bash
# See which pods are still on the node
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name>
```

Common blockers include pods with PodDisruptionBudgets that prevent eviction or pods without a controller (bare pods).

## Step 4: Reboot the Node

Once the node is drained, proceed with the reboot:

```bash
# Reboot the drained node
talosctl reboot --nodes <node-ip>
```

The reboot typically takes one to three minutes depending on the hardware and boot configuration.

## Step 5: Wait for the Node to Come Back

Monitor the node's return:

```bash
# Watch for the node to become Ready again
kubectl get nodes -w
```

You can also check directly via talosctl:

```bash
# Check if the Talos API is responding after reboot
talosctl version --nodes <node-ip>
```

## Step 6: Uncordon the Node

Once the node is back and shows as Ready, allow scheduling again:

```bash
# Allow pods to be scheduled on the node again
kubectl uncordon <node-name>
```

Verify everything is healthy:

```bash
# The node should no longer show SchedulingDisabled
kubectl get nodes
```

## Rebooting Control Plane Nodes

Control plane nodes require extra caution. They run the Kubernetes API server and etcd, both of which are critical for cluster operation.

### Single Control Plane Reboot

With a three-node control plane, you can safely reboot one node at a time:

```bash
# Verify etcd health before rebooting
talosctl etcd members --nodes <other-cp-ip>

# Reboot the control plane node
talosctl reboot --nodes <cp-ip>

# Wait for it to return
talosctl health --nodes <cp-ip> --wait-timeout 5m
```

Do not reboot the next control plane node until the first one is fully back and etcd shows all members healthy.

### Rolling Control Plane Reboots

If you need to reboot all control plane nodes (for example, after a configuration change), do it one at a time:

```bash
# Reboot control plane nodes one by one
for node in $CP_NODE_1 $CP_NODE_2 $CP_NODE_3; do
    echo "Rebooting $node..."
    talosctl reboot --nodes $node

    # Wait for the node to come back
    sleep 30
    talosctl health --nodes $node --wait-timeout 5m

    echo "$node is back online"
    echo "Waiting 60 seconds before next reboot..."
    sleep 60
done
```

The sleep between reboots gives the cluster time to fully stabilize before the next disruption.

## Rebooting Worker Nodes in Bulk

For worker nodes, you can be more aggressive with reboots, but you should still be mindful of workload availability:

```bash
# Reboot workers in batches, not all at once
# This example reboots one worker at a time
for node in $WORKER_1 $WORKER_2 $WORKER_3; do
    NODE_NAME=$(kubectl get nodes -o wide | grep $node | awk '{print $1}')

    echo "Draining $NODE_NAME..."
    kubectl cordon $NODE_NAME
    kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data --timeout=300s

    echo "Rebooting $node..."
    talosctl reboot --nodes $node

    # Wait for node to return
    sleep 60
    kubectl uncordon $NODE_NAME

    echo "$NODE_NAME is back online"
done
```

## Using Pod Disruption Budgets

If your workloads define PodDisruptionBudgets (PDBs), the drain command will respect them. This is your safety net for ensuring application availability during reboots:

```yaml
# Example PDB that ensures at least 2 replicas are always available
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

With this PDB in place, Kubernetes will refuse to evict pods if doing so would leave fewer than two replicas running.

## Handling Reboot Failures

If a node does not come back after a reboot:

```bash
# Check if the Talos API responds
talosctl version --nodes <node-ip>

# If it responds, check for boot issues
talosctl dmesg --nodes <node-ip>

# Check service status
talosctl services --nodes <node-ip>
```

If the node is completely unreachable, check the physical hardware or cloud instance status. You may need to use out-of-band management (IPMI for bare metal, cloud console for VMs) to investigate.

## Automating Safe Reboots

For clusters that need regular reboots (for security patches, for example), consider automating the process with a script that includes all safety checks:

```bash
#!/bin/bash
# safe-reboot.sh - Safely reboot a Talos node
NODE_IP=$1
NODE_NAME=$(kubectl get nodes -o wide | grep $NODE_IP | awk '{print $1}')

# Pre-flight check
echo "Checking cluster health..."
talosctl health --nodes $NODE_IP || exit 1

# Cordon and drain
kubectl cordon $NODE_NAME
kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data --timeout=300s || exit 1

# Reboot
talosctl reboot --nodes $NODE_IP

# Wait and uncordon
echo "Waiting for node to return..."
sleep 60
talosctl health --nodes $NODE_IP --wait-timeout 5m
kubectl uncordon $NODE_NAME

echo "Reboot complete for $NODE_NAME"
```

## Conclusion

Safe node reboots in Talos Linux follow a predictable pattern: check health, cordon, drain, reboot, wait, uncordon. For control plane nodes, add etcd health checks and do them one at a time. For workers, you can batch them but should still be mindful of workload availability. With PodDisruptionBudgets protecting your applications and proper automation in place, reboots become a routine operation that you can perform confidently at any time.
