# How to Use talosctl etcd members to List Members

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Etcd, Cluster Health, Kubernetes

Description: Learn how to use talosctl etcd members to inspect and manage etcd cluster membership in your Talos Linux cluster

---

The etcd cluster is the backbone of every Kubernetes deployment, and understanding its membership is essential for maintaining a healthy cluster. The `talosctl etcd members` command gives you visibility into which nodes are participating in the etcd cluster, their roles, and their health status. This guide covers how to use this command effectively for day-to-day operations and troubleshooting.

## What etcd Members Are

In a Talos Linux cluster, each control plane node runs an etcd member. These members form a distributed consensus group that stores all Kubernetes cluster state. For a cluster to function, a majority of etcd members (a quorum) must be online and communicating with each other.

For a three-member etcd cluster, at least two members must be online. For a five-member cluster, at least three must be online. Losing quorum means your Kubernetes API server cannot write to etcd, which effectively makes your cluster read-only or unavailable.

## Basic Usage

To list all etcd members in your cluster:

```bash
# List etcd members
talosctl etcd members --nodes 192.168.1.10
```

The output shows each etcd member along with its ID, hostname, peer URLs, and client URLs:

```text
ID                   HOSTNAME         PEER URLS                      CLIENT URLS
8e9e05c52164694d     cp-1            https://192.168.1.10:2380      https://192.168.1.10:2379
91bc3c398fb3c146     cp-2            https://192.168.1.11:2380      https://192.168.1.11:2379
a8aef21c3de6f95e     cp-3            https://192.168.1.12:2380      https://192.168.1.12:2379
```

You can target any control plane node for this command, and you will get the same result since all etcd members know about each other.

## Understanding the Output

Each column in the output tells you something important:

- **ID**: A unique identifier for the etcd member. You need this ID when removing or managing specific members.
- **HOSTNAME**: The hostname of the node running this etcd member.
- **PEER URLS**: The address other etcd members use to communicate with this member (port 2380).
- **CLIENT URLS**: The address that Kubernetes components use to read and write data to etcd (port 2379).

## Verifying Cluster Health

After checking membership, you should also verify that all members are healthy:

```bash
# List members
talosctl etcd members --nodes 192.168.1.10

# Check overall etcd health
talosctl health --nodes 192.168.1.10

# Check etcd service status
talosctl services --nodes 192.168.1.10 | grep etcd
```

A healthy etcd cluster should have all members listed, all peer URLs reachable, and all members in a "started" state.

## Checking Member Count

The number of etcd members should match your expectations. For most production clusters:

- 1 member: Development or testing only. No fault tolerance.
- 3 members: Standard production setup. Tolerates one member failure.
- 5 members: High availability setup. Tolerates two member failures.

```bash
# Quick check of member count
talosctl etcd members --nodes 192.168.1.10 | wc -l
# Subtract 1 for the header line
```

Running an even number of etcd members (2 or 4) provides no additional fault tolerance over one fewer member. Always use odd numbers.

## Monitoring etcd Members in Scripts

You can use the etcd members command in monitoring scripts:

```bash
#!/bin/bash
# etcd health monitoring script

CONTROL_PLANE_NODE="192.168.1.10"
EXPECTED_MEMBERS=3

# Get current member count
MEMBER_OUTPUT=$(talosctl etcd members --nodes "$CONTROL_PLANE_NODE" 2>&1)
CURRENT_MEMBERS=$(echo "$MEMBER_OUTPUT" | tail -n +2 | wc -l)

if [ "$CURRENT_MEMBERS" -ne "$EXPECTED_MEMBERS" ]; then
  echo "ALERT: Expected $EXPECTED_MEMBERS etcd members but found $CURRENT_MEMBERS"
  echo "Current members:"
  echo "$MEMBER_OUTPUT"
  # Send alert via your preferred notification system
  exit 1
fi

echo "OK: etcd cluster has $CURRENT_MEMBERS members as expected"
exit 0
```

## Handling Member Changes

### When a New Control Plane Node Joins

When you add a new control plane node to your Talos Linux cluster, it automatically joins the etcd cluster. You can watch this happen:

```bash
# Before adding the new node
talosctl etcd members --nodes 192.168.1.10

# Apply config to the new control plane node
talosctl apply-config --insecure --nodes 192.168.1.13 --file controlplane.yaml

# Wait a few minutes, then check members again
talosctl etcd members --nodes 192.168.1.10
```

You should see the new member appear in the list once it has joined.

### When a Control Plane Node Leaves

If a control plane node is permanently removed from the cluster, you need to remove its etcd member:

```bash
# List members to find the ID of the node being removed
talosctl etcd members --nodes 192.168.1.10

# Remove the member by ID
talosctl etcd remove-member --nodes 192.168.1.10 <member-id>

# Verify the member was removed
talosctl etcd members --nodes 192.168.1.10
```

Leaving a dead etcd member in the cluster can cause performance issues and eventual quorum problems. Always clean up after removing a control plane node.

## Troubleshooting etcd Membership Issues

### Member Shows as Unstarted

If a member appears in the list but is not fully started, check its logs:

```bash
# Check etcd logs on the problematic node
talosctl logs etcd --nodes 192.168.1.12

# Check if the etcd service is running
talosctl services --nodes 192.168.1.12 | grep etcd
```

Common causes include network partitions, disk space issues, or corrupted data directories.

### Member Missing from the List

If a control plane node exists but its etcd member is not showing up:

```bash
# Check if etcd is running on the node
talosctl services --nodes 192.168.1.12

# Check the machine config for etcd settings
talosctl get machineconfig --nodes 192.168.1.12 -o yaml | grep -A10 etcd

# Look for errors in the logs
talosctl logs etcd --nodes 192.168.1.12 | tail -50
```

### Split Brain Recovery

In rare cases, you might end up with a split-brain situation where two separate etcd clusters formed. This usually happens if `talosctl bootstrap` was accidentally run on multiple nodes:

```bash
# Check members from each control plane node separately
talosctl etcd members --nodes 192.168.1.10
talosctl etcd members --nodes 192.168.1.11
talosctl etcd members --nodes 192.168.1.12
```

If different nodes report different member lists, you have a split-brain. Recovery involves:

1. Taking an etcd snapshot from the node with the most recent data.
2. Resetting the problematic nodes.
3. Re-joining them to the correct cluster.

```bash
# Snapshot from the good cluster
talosctl etcd snapshot ./recovery-backup.snapshot --nodes 192.168.1.10

# Reset the problematic node
talosctl reset --nodes 192.168.1.12 --graceful

# Re-apply the configuration
talosctl apply-config --nodes 192.168.1.12 --file controlplane.yaml
```

## Using etcd Members with Maintenance Operations

Before performing maintenance on control plane nodes, always check etcd membership:

```bash
# Pre-maintenance checklist
echo "Checking etcd members..."
talosctl etcd members --nodes 192.168.1.10

echo "Checking cluster health..."
talosctl health --nodes 192.168.1.10

# Only proceed with maintenance if all members are healthy
echo "Safe to proceed with maintenance on one node"
```

If you are upgrading control plane nodes, check etcd members after each node upgrade:

```bash
# Upgrade first control plane node
talosctl upgrade --nodes 192.168.1.10 --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for it to come back
sleep 120

# Verify etcd membership is intact
talosctl etcd members --nodes 192.168.1.11

# Proceed to next node only if all members are present
```

## Best Practices

- Check etcd members regularly as part of your cluster health monitoring.
- Always verify member count before and after maintenance operations.
- Remove dead members promptly to avoid quorum issues.
- Use odd numbers of etcd members (1, 3, or 5).
- Never run more than 7 etcd members, as performance degrades beyond that.
- Keep etcd member IDs documented in your cluster inventory.
- Set up automated alerts for member count changes.
- Take an etcd snapshot before removing any member.

The `talosctl etcd members` command is a simple but essential tool for maintaining visibility into your etcd cluster. Regular use of this command helps you catch membership issues early, before they escalate into cluster-wide problems.
