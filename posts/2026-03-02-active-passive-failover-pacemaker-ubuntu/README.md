# How to Set Up Active-Passive Failover with Pacemaker on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, High Availability, Pacemaker, Failover, Clustering

Description: Step-by-step guide to configuring a two-node active-passive failover cluster with Pacemaker and Corosync on Ubuntu for high availability services.

---

An active-passive failover cluster keeps your services running even when a node fails. One node actively runs the services while the other waits in standby, ready to take over within seconds if the active node becomes unavailable. This pattern is simple to reason about, straightforward to maintain, and appropriate for most workloads that cannot run on multiple nodes simultaneously.

This guide walks through building a complete active-passive cluster on Ubuntu using Pacemaker and Corosync, using a virtual IP and an Apache web server as the example service.

## Environment Setup

For this guide, the setup uses two Ubuntu 22.04 nodes:

- node1: 192.168.1.10 (initially active)
- node2: 192.168.1.11 (initially passive/standby)
- Floating VIP: 192.168.1.50

Both nodes must be able to resolve each other by hostname. Add entries to `/etc/hosts` on both nodes if DNS is not available:

```bash
# Add to /etc/hosts on both nodes
echo "192.168.1.10 node1" | sudo tee -a /etc/hosts
echo "192.168.1.11 node2" | sudo tee -a /etc/hosts
```

## Installing the Cluster Stack

Run these commands on both nodes:

```bash
# Update and install packages
sudo apt update
sudo apt install -y pacemaker corosync pcs

# Set the hacluster password (used for node authentication)
sudo passwd hacluster
# Enter the same password on both nodes

# Enable and start pcsd
sudo systemctl enable --now pcsd
```

## Configuring Corosync Authentication

Run these commands from node1 only:

```bash
# Authenticate both nodes (you will be prompted for the hacluster password)
sudo pcs host auth node1 node2 -u hacluster -p yourpassword

# Create and start the cluster
sudo pcs cluster setup ha-cluster node1 node2 --start --enable

# Verify both nodes are online
sudo pcs status
```

Expected output from `pcs status` should show both nodes ONLINE and no resources yet.

## Disabling STONITH Temporarily for Testing

In a production setup, STONITH (fencing) must be configured. For initial testing you can disable it, but re-enable with proper configuration before production use:

```bash
# Disable STONITH for initial testing only
sudo pcs property set stonith-enabled=false

# Disable the quorum policy for a two-node cluster
sudo pcs property set no-quorum-policy=ignore
```

For a proper two-node cluster, the recommended quorum setting is:

```bash
# Better quorum handling for two-node clusters
sudo pcs quorum update two_node=1
```

## Creating the Virtual IP Resource

The floating IP is the resource clients will connect to. When failover happens, this IP moves to whichever node is active:

```bash
# Create the floating IP resource
sudo pcs resource create cluster-vip \
  ocf:heartbeat:IPaddr2 \
  ip=192.168.1.50 \
  cidr_netmask=24 \
  nic=eth0 \
  op monitor interval=30s

# Verify it started
sudo pcs status
# You should see cluster-vip running on one node
```

## Installing and Creating the Apache Resource

On both nodes, install Apache:

```bash
# Install Apache on both nodes
sudo apt install -y apache2

# Stop and disable Apache from managing itself (Pacemaker will manage it)
sudo systemctl stop apache2
sudo systemctl disable apache2

# Create a test page
echo "<h1>$(hostname) - HA Cluster</h1>" | sudo tee /var/www/html/index.html
```

Create the Apache resource in Pacemaker:

```bash
# Create Apache resource
sudo pcs resource create apache-web \
  ocf:heartbeat:apache \
  configfile=/etc/apache2/apache2.conf \
  statusurl="http://localhost/server-status" \
  op monitor interval=30s timeout=60s \
  op start timeout=60s \
  op stop timeout=60s
```

## Grouping Resources for Ordered Failover

Resources in a group start in order and stop in reverse order. They also run on the same node. Group the IP and Apache together:

```bash
# Create a group with IP first, then Apache
sudo pcs resource group add webservice cluster-vip apache-web

# Verify the group configuration
sudo pcs resource show webservice
sudo pcs status
```

## Adding Location Constraints (Optional)

By default, Pacemaker decides which node runs the group based on scores. You can set a preference for which node is primary:

```bash
# Prefer node1 with a score of 100
sudo pcs constraint location webservice prefers node1=100

# View location constraints
sudo pcs constraint location show
```

This means node1 will be chosen when both nodes are healthy, and the group will fail over to node2 if node1 goes down, then fail back to node1 when it recovers.

## Controlling Failback Behavior

By default, resources fail back to the preferred node when it recovers. You can disable this (sticky resources) to prevent unnecessary failovers:

```bash
# Make the group sticky (don't fail back automatically)
sudo pcs resource defaults update resource-stickiness=100

# Or set it per-group
sudo pcs resource update webservice resource-stickiness=100
```

## Testing Failover

Testing is the most important step - verify the cluster actually fails over:

```bash
# Check which node is running the group
sudo pcs status

# From a separate machine, test the VIP responds
curl http://192.168.1.50/

# Simulate node1 failure by putting it in standby
sudo pcs node standby node1

# Watch the failover happen
sudo pcs status
# webservice should now be running on node2

# Test that the VIP is still responding from node2
curl http://192.168.1.50/
```

Bring node1 back:

```bash
# Restore node1
sudo pcs node unstandby node1

# The group may fail back to node1 depending on your stickiness settings
sudo pcs status
```

## Testing Actual Node Crash

For a more realistic test, you can crash a node:

```bash
# On node1 (the active node), trigger a kernel panic
# WARNING: This will immediately crash the machine
sudo bash -c "echo c > /proc/sysrq-trigger"

# On node2 or another terminal, watch the failover
sudo pcs status
```

Without proper STONITH, the cluster may be cautious about starting resources after a node crashes because it cannot confirm the node is truly down. This is exactly why STONITH matters in production.

## Monitoring Cluster Health

```bash
# Watch status in real time
sudo watch -n2 pcs status

# View recent cluster events
sudo crm_mon -1

# Check pacemaker logs for failover events
sudo journalctl -u pacemaker --since "30 minutes ago"

# Check corosync ring status
sudo corosync-cfgtool -s

# Check quorum status
sudo corosync-quorumtool -s
```

## Configuring STONITH for Production

Before using this cluster in production, configure fencing. For a KVM/cloud environment you can use SBD:

```bash
# Re-enable STONITH
sudo pcs property set stonith-enabled=true

# Remove the no-quorum-policy override
sudo pcs property unset no-quorum-policy

# Add your fence agent (example with fence_ipmilan)
sudo pcs stonith create fence-node2 fence_ipmilan \
  pcmk_host_list="node2" \
  ipaddr="192.168.1.102" \
  login="admin" \
  passwd="password" \
  lanplus=1 \
  op monitor interval=60s

sudo pcs stonith create fence-node1 fence_ipmilan \
  pcmk_host_list="node1" \
  ipaddr="192.168.1.101" \
  login="admin" \
  passwd="password" \
  lanplus=1 \
  op monitor interval=60s

# Add location constraints so a node doesn't fence itself
sudo pcs constraint location fence-node1 avoids node1
sudo pcs constraint location fence-node2 avoids node2
```

An active-passive Pacemaker cluster is a reliable foundation for high availability. The pattern here - floating IP plus application resource in a group - applies to almost any service: databases, NFS servers, custom applications. Once you understand how resources, groups, and constraints interact, you can adapt this to your specific workload.
