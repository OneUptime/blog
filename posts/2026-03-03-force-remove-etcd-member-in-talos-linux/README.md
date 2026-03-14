# How to Force Remove an etcd Member in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, etcd, Cluster Recovery, Node Removal

Description: Step-by-step instructions for force removing an etcd member in Talos Linux when a node is offline or unresponsive.

---

When a control plane node in your Talos Linux cluster goes down and cannot be recovered, its etcd member stays in the cluster as an unreachable phantom. The remaining members keep trying to communicate with it, wasting resources and potentially causing instability. Force removing that member is necessary to restore the etcd cluster to a clean state. This guide walks through the process and explains when and why you should use it.

## When Force Removal Is Necessary

A graceful etcd leave is always preferred. The `talosctl etcd leave` command tells a node to remove itself from the cluster cleanly. But there are situations where that is not possible:

- The node's hardware has failed completely
- The node is powered off and will not be turned back on
- The node's disk has been corrupted and it cannot boot
- A network partition has permanently separated the node
- The node was decommissioned without proper cluster removal

In all these cases, the etcd member is gone but its entry remains in the cluster. The remaining members see it as a failed peer and log errors about unreachable connections. This is when you need force removal.

## Understanding the Risks

Force removing an etcd member is a destructive operation. Before proceeding, understand these risks:

- If you remove a member that is actually just temporarily unreachable, it will be permanently excluded. When it comes back online, it will have stale data and need to be fully reset.
- Removing a member reduces your fault tolerance. In a three-node cluster, removing one member leaves two. Those two members form a quorum, but losing one more would break it entirely.
- If you accidentally remove the wrong member, you could disrupt the cluster.

Always double-check the member ID before executing the removal.

## Prerequisites

Before force removing a member, verify:

1. The node is truly gone and not just temporarily unreachable
2. You have identified the correct member ID
3. The remaining members still form a quorum

```bash
# Verify cluster status
talosctl etcd members --nodes <healthy-cp-ip>

# Check which members are healthy
talosctl health --nodes <healthy-cp-ip> --wait-timeout 2m
```

## Step 1: Take an etcd Snapshot

Before any destructive operation, create a backup:

```bash
# Create a snapshot from a healthy control plane node
talosctl etcd snapshot /tmp/etcd-backup-before-removal.snapshot --nodes <healthy-cp-ip>
```

Store this snapshot somewhere safe. If something goes wrong, you can recover from it.

## Step 2: Identify the Member to Remove

List all etcd members and find the one that corresponds to the failed node:

```bash
# List all etcd members with their IDs
talosctl etcd members --nodes <healthy-cp-ip>
```

Output looks like:

```text
NODE        MEMBERS
10.0.0.1    10.0.0.1 (id: 7c2a7a1d4d1e2f3a), 10.0.0.2 (id: 8b3c9e4f5a6b7c8d), 10.0.0.3 (id: 9d4e0f1a2b3c4d5e)
```

If node 10.0.0.2 is the failed node, its member ID is `8b3c9e4f5a6b7c8d`.

Verify this is the right one by cross-referencing with your infrastructure records:

```bash
# Check which node corresponds to which etcd member
kubectl get nodes -o wide | grep "control-plane"
```

## Step 3: Force Remove the Member

Execute the removal from a healthy control plane node:

```bash
# Force remove the etcd member using its ID
talosctl etcd remove-member 8b3c9e4f5a6b7c8d --nodes <healthy-cp-ip>
```

This command tells the etcd cluster to remove the specified member. Unlike `etcd leave`, which is initiated by the departing member, `remove-member` is executed from a surviving member and does not require the target to be online.

## Step 4: Verify the Removal

```bash
# Confirm the member has been removed
talosctl etcd members --nodes <healthy-cp-ip>
```

You should now see one fewer member. For a three-node cluster that lost one member, you should see two members.

## Step 5: Remove the Node from Kubernetes

The Kubernetes API server may still list the failed node:

```bash
# Delete the node object from Kubernetes
kubectl delete node <failed-node-name>
```

## Step 6: Verify Cluster Health

Run a full health check:

```bash
# Comprehensive health check
talosctl health --nodes <healthy-cp-ip> --wait-timeout 5m
```

Check that the API server is responding and system pods are running:

```bash
# Verify Kubernetes functionality
kubectl get nodes
kubectl get pods -n kube-system
```

## What Happens After Removal

After removing a member from a two-member etcd cluster (originally three), your cluster operates with reduced redundancy. Specifically:

- etcd still has quorum with two members
- But losing one more member will break quorum
- No write operations will be possible without quorum

You should plan to add a replacement control plane node as soon as possible to restore the cluster to three members.

## Adding a Replacement Node

After force removing the failed member, add a new control plane node:

```bash
# Boot a new machine with Talos and apply control plane configuration
talosctl apply-config --insecure --nodes <new-node-ip> --file controlplane.yaml
```

The new node will automatically join the etcd cluster. Verify:

```bash
# Check that the new member has joined
talosctl etcd members --nodes <healthy-cp-ip>
```

You should be back to three members.

## Edge Cases

### Removing from a Two-Node Cluster

If you started with three members and one has already been removed (or failed), you now have two. Removing another member leaves you with one, which still works but has zero fault tolerance.

```bash
# This works but leaves a single-member etcd cluster
talosctl etcd remove-member <member-id> --nodes <remaining-cp-ip>
```

Avoid running a single-member etcd cluster in production for any length of time.

### The Wrong Member Was Removed

If you accidentally removed a healthy member:

```bash
# The removed member's etcd will stop functioning
# You need to reset it and rejoin it to the cluster

# On the accidentally removed node
talosctl reset --nodes <accidentally-removed-ip>

# Then re-apply its configuration
talosctl apply-config --insecure --nodes <accidentally-removed-ip> --file controlplane.yaml
```

This is why taking a snapshot before removal is so important.

### Cannot Connect to Any Control Plane Node

If you cannot reach any control plane node via talosctl, you may have lost quorum. In this case, force removing a member will not help because you need quorum to make changes to the member list.

You will need to recover etcd from a snapshot:

```bash
# This requires bootstrapping the etcd cluster from a snapshot
# which is a more involved recovery process
```

## Automating Force Removal

For clusters with automated recovery, you can script the force removal:

```bash
#!/bin/bash
# force-remove-etcd-member.sh
# Usage: ./force-remove-etcd-member.sh <failed-node-ip> <healthy-node-ip>

FAILED_NODE=$1
HEALTHY_NODE=$2

# Find the member ID for the failed node
MEMBER_ID=$(talosctl etcd members --nodes $HEALTHY_NODE 2>/dev/null | \
    grep "$FAILED_NODE" | grep -o 'id: [a-f0-9]*' | awk '{print $2}')

if [ -z "$MEMBER_ID" ]; then
    echo "Could not find member ID for $FAILED_NODE"
    exit 1
fi

echo "Found member ID: $MEMBER_ID for node $FAILED_NODE"

# Take a snapshot first
echo "Taking etcd snapshot..."
talosctl etcd snapshot "/tmp/etcd-backup-$(date +%s).snapshot" --nodes $HEALTHY_NODE

# Remove the member
echo "Removing member $MEMBER_ID..."
talosctl etcd remove-member $MEMBER_ID --nodes $HEALTHY_NODE

# Verify
echo "Verifying removal..."
talosctl etcd members --nodes $HEALTHY_NODE

# Clean up Kubernetes
NODE_NAME=$(kubectl get nodes -o wide 2>/dev/null | grep $FAILED_NODE | awk '{print $1}')
if [ -n "$NODE_NAME" ]; then
    echo "Removing $NODE_NAME from Kubernetes..."
    kubectl delete node $NODE_NAME
fi

echo "Done. Remember to add a replacement control plane node."
```

## Prevention

To minimize the need for force removals:

- Always use `talosctl etcd leave` before shutting down or resetting a control plane node
- Monitor etcd health regularly so you catch failing nodes early
- Take regular etcd snapshots so you have recovery options
- Plan control plane operations carefully and document the expected state

## Conclusion

Force removing an etcd member is a necessary operation when a Talos Linux control plane node fails permanently. The process is straightforward - identify the member ID, execute the removal from a healthy node, and verify the result. But it comes with risks, so always take a snapshot first, double-check the member ID, and plan to add a replacement node promptly. With proper preparation and careful execution, force removal restores your etcd cluster to a clean state and gets you back to normal operations.
