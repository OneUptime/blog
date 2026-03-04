# How to Perform Cluster Maintenance Without Downtime on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Maintenance, High Availability, Cluster, Linux

Description: Learn how to perform maintenance on RHEL 9 Pacemaker cluster nodes without causing service downtime.

---

Cluster maintenance on RHEL 9 includes tasks like applying patches, upgrading software, and replacing hardware. Pacemaker provides maintenance modes and controlled failover to keep services running while you work on individual nodes.

## Prerequisites

- A running RHEL 9 Pacemaker cluster with at least two nodes
- Root or sudo access

## Pre-Maintenance Checks

Before starting maintenance, verify cluster health:

```bash
sudo pcs status
sudo pcs resource failcount show
sudo corosync-quorumtool
```

Ensure:

- All nodes are online
- All resources are running
- No failure counts exist
- The cluster has quorum

## Method 1: Node Standby Mode

Standby mode moves all resources off a node while keeping it in the cluster:

```bash
sudo pcs node standby node1
```

Verify resources moved:

```bash
sudo pcs status
```

Perform maintenance on node1 (patches, upgrades, reboots).

Bring the node back:

```bash
sudo pcs node unstandby node1
```

## Method 2: Maintenance Mode for a Node

Maintenance mode tells Pacemaker to stop managing resources on a node but does not move them:

```bash
sudo pcs node maintenance node1
```

Resources stay where they are, but Pacemaker stops monitoring them on node1. This is useful for troubleshooting a resource without triggering failover.

Exit maintenance mode:

```bash
sudo pcs node unmaintenance node1
```

## Method 3: Cluster-Wide Maintenance Mode

Put the entire cluster in maintenance mode:

```bash
sudo pcs property set maintenance-mode=true
```

All monitoring and management stops. No failover occurs during this time.

Exit cluster maintenance mode:

```bash
sudo pcs property set maintenance-mode=false
```

## Method 4: Resource-Level Maintenance

Disable management for a specific resource:

```bash
sudo pcs resource unmanage WebServer
```

The resource keeps running but Pacemaker will not monitor, restart, or move it.

Re-enable management:

```bash
sudo pcs resource manage WebServer
```

## Rolling Upgrade Procedure

For upgrading all nodes without downtime:

### Step 1: Upgrade Node 1

```bash
# Move resources away
sudo pcs node standby node1

# Verify resources are running on other nodes
sudo pcs status

# Perform the upgrade on node1
sudo dnf upgrade -y
sudo reboot
```

### Step 2: Verify Node 1

After reboot:

```bash
sudo pcs node unstandby node1
sudo pcs status
```

Wait for node1 to rejoin and stabilize.

### Step 3: Upgrade Node 2

```bash
sudo pcs node standby node2
sudo pcs status

# Perform the upgrade on node2
sudo dnf upgrade -y
sudo reboot
```

### Step 4: Verify Node 2

```bash
sudo pcs node unstandby node2
sudo pcs status
```

Repeat for additional nodes.

## Upgrading Cluster Software

When upgrading Pacemaker or Corosync:

```bash
# Put node in standby
sudo pcs node standby node1

# Stop the cluster on this node
sudo pcs cluster stop node1

# Upgrade packages
sudo dnf upgrade pacemaker corosync pcs -y

# Start the cluster
sudo pcs cluster start node1

# Remove standby
sudo pcs node unstandby node1

# Verify
sudo pcs status
```

## Adjusting Quorum During Maintenance

If taking nodes offline would lose quorum, temporarily adjust expected votes:

```bash
# Check current quorum
sudo corosync-quorumtool

# Reduce expected votes (be careful)
sudo pcs quorum expected-votes 2
```

Restore after maintenance:

```bash
# Quorum auto-adjusts when nodes rejoin
sudo corosync-quorumtool
```

## Verifying Post-Maintenance Health

After maintenance is complete:

```bash
# Check all nodes are online
sudo pcs status nodes

# Check all resources are running
sudo pcs status resources

# Check for any failures
sudo pcs resource failcount show

# Verify quorum
sudo corosync-quorumtool

# Check fencing
sudo pcs stonith status
```

## Conclusion

RHEL 9 Pacemaker clusters support zero-downtime maintenance through standby mode, maintenance mode, and rolling upgrades. Always verify cluster health before and after maintenance, and use the appropriate mode for your task. Standby mode is the safest for node-level maintenance as it ensures controlled resource migration.
