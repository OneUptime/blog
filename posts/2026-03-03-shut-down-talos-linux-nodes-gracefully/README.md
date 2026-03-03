# How to Shut Down Talos Linux Nodes Gracefully

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Node Shutdown, Graceful Shutdown, Cluster Operations

Description: Learn how to gracefully shut down Talos Linux nodes while preserving workload availability and cluster integrity.

---

Shutting down a Talos Linux node is different from rebooting it. When you reboot, the node comes back automatically. When you shut it down, it stays off until someone or something powers it back on. This distinction matters because your cluster needs to handle the absence of that node for an indefinite period. This guide explains how to shut down Talos Linux nodes properly.

## When to Shut Down vs. Reboot

Shutting down is appropriate when:

- You are performing physical hardware maintenance (replacing disks, memory, NICs)
- The node is being decommissioned permanently
- You are moving hardware to a different data center or rack
- Power maintenance is planned for the facility
- You want to save costs in a cloud environment during low-traffic periods

If the node will come back quickly and no physical work is needed, a reboot is usually a better choice.

## The Basic Shutdown Command

Talos Linux provides a clean shutdown command:

```bash
# Shut down a single node
talosctl shutdown --nodes <node-ip>
```

This command tells the Talos OS to gracefully stop all services and power off the machine. But as with reboots, running this without preparation can cause problems.

## Graceful Shutdown Procedure for Worker Nodes

### Step 1: Assess Impact

Before shutting down a worker, understand what is running on it:

```bash
# List all pods running on the target node
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name> -o wide
```

Check if any critical workloads would be affected:

```bash
# Check pod disruption budgets
kubectl get pdb --all-namespaces
```

If a PDB would be violated by removing this node's pods, you may need to scale up first.

### Step 2: Cordon the Node

```bash
# Prevent new pods from being scheduled
kubectl cordon <node-name>
```

### Step 3: Drain the Node

```bash
# Evict all pods gracefully
kubectl drain <node-name> \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --timeout=300s
```

Wait for the drain to complete. Verify all non-DaemonSet pods have been moved:

```bash
# Only DaemonSet pods should remain
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name>
```

### Step 4: Shut Down

```bash
# Power off the node
talosctl shutdown --nodes <node-ip>
```

The node will stop all Talos services and power off the hardware.

### Step 5: Verify

From the remaining nodes, confirm the target is gone:

```bash
# Node should show NotReady status
kubectl get nodes
```

## Graceful Shutdown Procedure for Control Plane Nodes

Control plane shutdowns need additional steps to protect etcd.

### Step 1: Verify Quorum

Make sure you will still have quorum after the shutdown:

```bash
# Check current etcd members
talosctl etcd members --nodes <another-cp-ip>
```

With three control plane nodes, you can safely shut down one. With five, you can shut down two. Never shut down so many that you lose majority.

### Step 2: Cordon and Drain

```bash
# Same as worker nodes
kubectl cordon <cp-node-name>
kubectl drain <cp-node-name> --ignore-daemonsets --delete-emptydir-data
```

### Step 3: Consider etcd Impact

If the shutdown will be brief (minutes to hours), you can leave the node as an etcd member. The remaining members will maintain quorum and the node will rejoin when it comes back.

If the shutdown will be extended (days or longer), consider removing the node from etcd to prevent the cluster from trying to replicate to an unreachable member:

```bash
# For extended shutdowns, remove from etcd
talosctl etcd leave --nodes <cp-ip>
```

### Step 4: Shut Down

```bash
# Power off the control plane node
talosctl shutdown --nodes <cp-ip>
```

### Step 5: Monitor Cluster Health

```bash
# Verify the remaining cluster is healthy
talosctl health --nodes <remaining-cp-ip>
```

## Shutting Down Multiple Nodes

If you need to shut down multiple nodes (for example, for a planned power outage), follow this order:

1. Shut down worker nodes first
2. Then shut down control plane nodes, one at a time
3. Leave the last control plane node running as long as possible

```bash
# Drain and shut down workers
for node in $WORKER_IPS; do
    NODE_NAME=$(kubectl get nodes -o wide | grep $node | awk '{print $1}')
    kubectl cordon $NODE_NAME
    kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data --timeout=300s
    talosctl shutdown --nodes $node
    echo "Shut down $NODE_NAME"
done

# Then handle control plane nodes
for node in $CP_IPS; do
    NODE_NAME=$(kubectl get nodes -o wide | grep $node | awk '{print $1}')
    kubectl cordon $NODE_NAME
    kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data --timeout=300s
    talosctl shutdown --nodes $node
    echo "Shut down $NODE_NAME"
    sleep 30  # Give etcd time to adjust
done
```

## Bringing Nodes Back Up

When you are ready to power the nodes back on, reverse the order:

1. Start control plane nodes first
2. Wait for etcd quorum to be established
3. Then start worker nodes

After each node comes back, verify it is healthy:

```bash
# Check the node has rejoined
kubectl get nodes

# For control plane nodes, verify etcd
talosctl etcd members --nodes <cp-ip>
```

If a control plane node was removed from etcd before shutdown, you may need to rejoin it. In most cases where etcd membership was preserved, the node will simply rejoin automatically.

After all nodes are back, uncordon them:

```bash
# Allow scheduling on all nodes again
kubectl uncordon <node-name>
```

## Handling Forced Shutdowns

Sometimes a graceful shutdown is not possible. Maybe the node is unresponsive or you need to cut power immediately. In these cases:

```bash
# Force shutdown without waiting for graceful drain
talosctl shutdown --nodes <node-ip> --force
```

If even the talosctl command cannot reach the node, you will need to use out-of-band methods:

- IPMI power off for bare metal
- Cloud provider console for VMs
- Physical power button as a last resort

After a forced shutdown, the cluster will eventually mark the node as NotReady, and pods will be rescheduled. This process can take several minutes because Kubernetes uses timeouts to detect node failure.

## Persistent Storage Considerations

If the node being shut down has local persistent volumes, the pods using those volumes will not be reschedulable to other nodes. Consider these strategies:

- Use replicated storage solutions that can handle node absence
- For StatefulSets, ensure replicas are spread across multiple nodes
- Back up critical data before planned shutdowns

```bash
# Check for persistent volume claims on the target node
kubectl get pv -o wide | grep <node-name>
```

## Automating Shutdown Procedures

For environments with regular maintenance windows, create a shutdown script:

```bash
#!/bin/bash
# graceful-shutdown.sh
# Usage: ./graceful-shutdown.sh <node-ip>

NODE_IP=$1
NODE_NAME=$(kubectl get nodes -o wide | grep $NODE_IP | awk '{print $1}')

if [ -z "$NODE_NAME" ]; then
    echo "Node not found for IP $NODE_IP"
    exit 1
fi

echo "Starting graceful shutdown of $NODE_NAME ($NODE_IP)"

# Check if this is a control plane node
IS_CP=$(kubectl get node $NODE_NAME -o jsonpath='{.metadata.labels.node-role\.kubernetes\.io/control-plane}')

if [ -n "$IS_CP" ]; then
    echo "This is a control plane node. Checking etcd quorum..."
    MEMBER_COUNT=$(talosctl etcd members --nodes $NODE_IP 2>/dev/null | wc -l)
    if [ "$MEMBER_COUNT" -le 3 ]; then
        echo "Warning: Only $MEMBER_COUNT etcd members. Proceed with caution."
    fi
fi

kubectl cordon $NODE_NAME
kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data --timeout=300s

echo "Shutting down $NODE_NAME..."
talosctl shutdown --nodes $NODE_IP

echo "Shutdown complete."
```

## Conclusion

Graceful shutdowns in Talos Linux follow a clear pattern: assess impact, cordon, drain, then shut down. For control plane nodes, always verify etcd quorum and consider whether to remove the node from etcd for extended outages. When bringing nodes back, start with the control plane and work outward. Having a documented and automated shutdown procedure saves time and reduces the risk of mistakes during maintenance windows.
