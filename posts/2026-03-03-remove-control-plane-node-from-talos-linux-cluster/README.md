# How to Remove a Control Plane Node from a Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Control Plane, Cluster Management, etcd

Description: Learn how to safely remove a control plane node from a Talos Linux cluster without disrupting cluster operations or losing etcd quorum.

---

Removing a control plane node from a Talos Linux cluster is a task that requires careful planning. Unlike worker nodes, control plane nodes run critical components like the Kubernetes API server and etcd. If you remove one incorrectly, you risk losing quorum and taking down the entire cluster. This guide walks through every step of the process so you can do it safely.

## Why Would You Remove a Control Plane Node?

There are several reasons you might need to remove a control plane node. Maybe the underlying hardware is failing and needs to be decommissioned. Perhaps you scaled up to five control plane nodes during a migration and now want to scale back down to three. Or you might be replacing older machines with newer ones in a rolling fashion.

Whatever the reason, the key concern is always the same: maintaining etcd quorum. In a cluster with three control plane nodes, you need at least two healthy members to maintain quorum. Losing quorum means losing write access to the cluster state, which effectively brings everything to a halt.

## Prerequisites

Before you begin, make sure you have the following in place:

- `talosctl` installed and configured with the correct endpoints and credentials
- At least three control plane nodes in the cluster (you should never go below three)
- The cluster is currently healthy and all etcd members are in sync

Check your cluster health first:

```bash
# Verify the cluster is healthy before making changes
talosctl health --nodes <any-control-plane-ip>
```

Also verify etcd membership:

```bash
# List all current etcd members
talosctl etcd members --nodes <any-control-plane-ip>
```

You should see all your control plane nodes listed as healthy members.

## Step 1: Identify the Node to Remove

Decide which control plane node you want to remove. Get the node details:

```bash
# List all nodes in the cluster with their roles
kubectl get nodes -o wide
```

Note the IP address and hostname of the node you plan to remove. You will need these throughout the process.

```bash
# Store the node IP for convenience
NODE_TO_REMOVE="192.168.1.10"
```

## Step 2: Cordon the Node

First, prevent any new workloads from being scheduled on the node:

```bash
# Mark the node as unschedulable
kubectl cordon <node-name>
```

This tells the Kubernetes scheduler to stop placing new pods on this node while existing pods continue running.

## Step 3: Drain the Node

Next, gracefully evict all pods from the node:

```bash
# Evict all pods from the node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

The `--ignore-daemonsets` flag is important because DaemonSet pods cannot be evicted through normal means. The `--delete-emptydir-data` flag allows eviction of pods using emptyDir volumes, acknowledging that this data will be lost.

Wait until the drain completes. If any pods are stuck, investigate and resolve them before continuing.

## Step 4: Remove the etcd Member

This is the most critical step. You must remove the node from etcd before shutting it down. If you shut down the node first, the etcd cluster will see it as a failed member and you may run into issues.

First, identify the etcd member ID:

```bash
# Get the etcd member list with IDs
talosctl etcd members --nodes <any-other-control-plane-ip>
```

Then remove the member using the leave command from the node being removed:

```bash
# Tell the node to leave the etcd cluster gracefully
talosctl etcd leave --nodes $NODE_TO_REMOVE
```

This command instructs the etcd instance on the target node to gracefully remove itself from the cluster. After this, verify that the member has been removed:

```bash
# Confirm the member was removed
talosctl etcd members --nodes <any-other-control-plane-ip>
```

You should now see one fewer member in the list.

## Step 5: Reset the Node

Once the etcd member has been removed, reset the node to clean up its state:

```bash
# Reset the node, wiping its configuration and state
talosctl reset --nodes $NODE_TO_REMOVE --graceful=true
```

The `--graceful=true` flag ensures the node shuts down services properly before wiping. This command will remove all Talos state from the node, effectively returning it to an unconfigured state.

## Step 6: Remove the Node from Kubernetes

The Kubernetes API server may still show the node in its list even after the reset. Remove it manually:

```bash
# Delete the node object from the Kubernetes API
kubectl delete node <node-name>
```

## Step 7: Update Your talosctl Configuration

After removing the node, update your talosctl configuration to remove the old endpoint:

```bash
# Edit the talosctl config to remove the old endpoint
talosctl config endpoints <remaining-cp-ip-1> <remaining-cp-ip-2>
```

If you use any automation or configuration management tools, update those as well to reflect the new cluster topology.

## Step 8: Verify Cluster Health

Finally, run a comprehensive health check:

```bash
# Run a full health check on the remaining cluster
talosctl health --nodes <remaining-control-plane-ip>
```

Also check that etcd is healthy:

```bash
# Verify etcd quorum and health
talosctl etcd members --nodes <remaining-control-plane-ip>
```

And confirm Kubernetes is functioning properly:

```bash
# Check all system pods are running
kubectl get pods -n kube-system

# Verify all remaining nodes are ready
kubectl get nodes
```

## Common Mistakes to Avoid

One of the most common mistakes is shutting down the node before removing it from etcd. When a node goes offline while still an etcd member, the remaining members will keep trying to reach it, which wastes resources and can cause leader election delays.

Another mistake is removing a control plane node when you only have three, leaving you with two. While a two-node etcd cluster technically works, it offers no fault tolerance. Losing one more node would break quorum. Always maintain an odd number of control plane nodes (3, 5, or 7) for proper fault tolerance.

Finally, forgetting to update the talosctl endpoints is a subtle issue that will bite you later. If your tooling still tries to connect to the removed node, you will get timeouts and confusing error messages.

## What If Something Goes Wrong?

If the etcd leave command fails, you can forcefully remove the member from another node:

```bash
# Force remove an etcd member by ID from a healthy node
talosctl etcd remove-member <member-id> --nodes <healthy-control-plane-ip>
```

If the cluster loses quorum during the process, you will need to recover etcd from a snapshot. This is why it is so important to have a backup before starting.

```bash
# Always take an etcd snapshot before major operations
talosctl etcd snapshot /path/to/backup.snapshot --nodes <control-plane-ip>
```

## Conclusion

Removing a control plane node from a Talos Linux cluster is straightforward when you follow the correct order of operations. The critical sequence is: cordon, drain, remove from etcd, reset the node, and clean up. Always verify cluster health before and after the operation, and never forget to update your configuration to reflect the new topology. With these steps, you can safely scale down your control plane without any disruption to running workloads.
