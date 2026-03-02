# How to Troubleshoot HA Cluster Split-Brain Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, High Availability, Pacemaker, Clustering, Troubleshooting

Description: A practical guide to identifying, diagnosing, and recovering from split-brain scenarios in Pacemaker high availability clusters on Ubuntu.

---

Split-brain is one of the most serious failure modes in a high availability cluster. It occurs when cluster nodes lose communication with each other and both sides believe they are the active partition, leading to both nodes attempting to manage the same resources. The result can range from service disruption to data corruption, depending on what resources are involved.

This guide covers how to recognize when split-brain has occurred, understand what caused it, and recover safely.

## Understanding Split-Brain

In a two-node cluster with no quorum device, a network partition means both nodes simultaneously think the other is dead. Without fencing:

- Both nodes may start the same floating IP
- Both nodes may mount the same shared storage
- Both nodes may write to a database

The consequences are serious. Two nodes writing to the same filesystem simultaneously causes filesystem corruption. Two nodes hosting the same IP address causes network instability. This is why fencing (STONITH) is not optional in production clusters - it is the mechanism that ensures only one side can win after a split.

## Recognizing a Split-Brain

Signs that split-brain has occurred or is imminent:

```bash
# Check cluster status
sudo pcs status

# Signs to look for:
# - Nodes showing as OFFLINE or UNCLEAN
# - Resources marked as failed
# - Multiple nodes running the same resource
# - "Last updated" time showing stale data

# Check corosync ring status
sudo corosync-cfgtool -s

# Check quorum status
sudo corosync-quorumtool -s
```

An actual split-brain might show:

```
Cluster name: ha-cluster
Stack: corosync
WARNINGS:
  No stonith devices and stonith-enabled is not false
  Resources need fencing

Node List:
  * Node node2: UNCLEAN (offline)
  * Online: [ node1 ]

Full List of Resources:
  * cluster-vip   (ocf::heartbeat:IPaddr2):   Started node1
```

The `UNCLEAN` state means the cluster cannot confirm the node is down. Without fencing, Pacemaker will not start resources on the remaining node because it cannot guarantee the UNCLEAN node has stopped.

## Investigating the Cause

Before recovering, understand what caused the split:

```bash
# Check corosync logs for communication errors
sudo journalctl -u corosync --since "2 hours ago" | grep -E "error|warning|TOTEM|ring"

# Look for network ring failures
sudo grep -i "failed\|disconnected\|lost" /var/log/corosync/corosync.log | tail -50

# Check pacemaker logs for the sequence of events
sudo journalctl -u pacemaker --since "2 hours ago" | tail -100

# Check system logs for kernel/hardware issues
sudo journalctl -k --since "2 hours ago" | grep -iE "error|warning|failed"

# Check network interface status
ip link show
ip -s link

# Check for dropped packets
netstat -s | grep -i "error\|discard\|fail"
```

Common causes of split-brain:

- Network interface failure or cable disconnect
- Switch failure or misconfiguration
- Network saturation causing timeout
- Virtual machine live migration interrupting connectivity
- Bug in Corosync or network driver

## Checking for Duplicate Resources

If you suspect both nodes are running the same resource:

```bash
# Check if the IP is up on both nodes
# Run on both nodes
ip addr show | grep 192.168.1.50

# Check which node is actively responding
arping -I eth0 192.168.1.50

# Check for duplicate ARP entries
arp -n | grep 192.168.1.50

# For storage, check if the filesystem is mounted on both nodes
# Run on both nodes
mount | grep /shared
```

## Safe Recovery Procedure

Recovery from split-brain requires careful sequencing. The goal is to get to a state where exactly one node is managing resources, then reconnect the cluster.

### Step 1: Stop Resources on the Losing Node

First, determine which node should "win" (usually the one with the most current data or the designated primary):

```bash
# On the node that should LOSE (step down gracefully)
sudo pcs node standby node2

# If pcs is unavailable due to cluster partitioning, use systemctl
sudo systemctl stop pacemaker

# Force stop any resources if they are still running
sudo ip addr del 192.168.1.50/24 dev eth0
sudo systemctl stop apache2
```

### Step 2: Verify the Winning Node Has Sole Control

```bash
# On the winning node, check resource status
sudo pcs status

# Verify the IP is only on this node
ip addr show | grep 192.168.1.50

# Check that services are running correctly
curl http://192.168.1.50/
```

### Step 3: Fix the Underlying Network Issue

```bash
# Check connectivity to the other node
ping -c5 node2

# Check corosync ring connectivity
sudo corosync-cfgtool -s

# Verify the corosync link is up
sudo corosync-cmapctl | grep members

# If using a dedicated cluster network, verify the interface is up
ip link show eth1
```

### Step 4: Rejoin the Cluster

Once the network issue is resolved:

```bash
# On the rejoining node (node2), start corosync and pacemaker
sudo systemctl start corosync
sudo systemctl start pacemaker

# Watch the cluster reform
sudo pcs status

# On the managing node, unstandby the rejoined node
sudo pcs node unstandby node2

# Clear any failed states
sudo pcs resource cleanup
```

## Recovering from an UNCLEAN State

When a node is stuck in UNCLEAN state and fencing is not configured:

```bash
# Check the UNCLEAN node status
sudo pcs status nodes

# If you have physically verified the node is powered off,
# you can confirm it is down manually (USE ONLY WHEN NODE IS CONFIRMED OFF)
sudo pcs stonith confirm node2

# If STONITH is not configured and you need to proceed:
# First ensure the problem node is actually powered off or completely isolated
# Then clear the failed state
sudo pcs node unstandby node2
```

## Preventing Split-Brain

### Implement Proper STONITH

```bash
# Enable STONITH
sudo pcs property set stonith-enabled=true

# Add fence agents appropriate for your environment
# Example with IPMI
sudo pcs stonith create fence-node2 fence_ipmilan \
  pcmk_host_list="node2" \
  ipaddr="192.168.1.102" \
  login="admin" \
  passwd="password" \
  lanplus=1

sudo pcs stonith create fence-node1 fence_ipmilan \
  pcmk_host_list="node1" \
  ipaddr="192.168.1.101" \
  login="admin" \
  passwd="password" \
  lanplus=1
```

### Use a Quorum Device

```bash
# On a third machine (not a cluster node), install qnetd
sudo apt install -y corosync-qnetd
sudo corosync-qnetd-certutil -i
sudo systemctl enable --now corosync-qnetd

# On cluster nodes, add the qdevice
sudo pcs quorum device add model net \
  host=qdevice-host \
  algorithm=lms

# Verify quorum device is active
sudo corosync-quorumtool -s
```

### Use a Redundant Cluster Network

Configure two network rings in Corosync so that a single network failure does not isolate nodes:

```
totem {
    version: 2
    transport: knet
    # knet supports multiple links automatically
}

nodelist {
    node {
        ring0_addr: 192.168.1.10
        ring1_addr: 10.0.0.10
        name: node1
        nodeid: 1
    }
    node {
        ring0_addr: 192.168.1.11
        ring1_addr: 10.0.0.11
        name: node2
        nodeid: 2
    }
}
```

## Cluster Health Checks to Run Regularly

```bash
# Verify cluster is quorate
sudo corosync-quorumtool -s | grep Quorate

# Check for any failed resources
sudo pcs status | grep -i "failed\|error\|stopped"

# Verify STONITH is configured and working
sudo pcs stonith show
sudo pcs property show stonith-enabled

# Check corosync ring health
sudo corosync-cfgtool -s

# Check for any pending operations
sudo crm_mon -1 | grep -i "pending\|blocked"

# Verify all nodes are online
sudo pcs status nodes
```

Split-brain prevention is far easier than split-brain recovery. The three pillars are: proper STONITH configuration, a quorum device or adequate node count, and redundant cluster network paths. Each one addresses a different failure scenario. With all three in place, the cluster can resolve ambiguous failures automatically without administrator intervention.
