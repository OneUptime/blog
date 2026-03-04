# How to Configure Quorum and Voting in Multi-Node RHEL Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Quorum, Voting, Pacemaker, Corosync, Cluster, High Availability, Linux

Description: Learn how to configure quorum and voting mechanisms in multi-node RHEL Pacemaker clusters for split-brain prevention.

---

In multi-node Pacemaker clusters on RHEL, quorum and voting mechanisms prevent split-brain scenarios by ensuring only the partition with a majority of votes can run resources. This guide covers quorum configuration for clusters with three or more nodes.

## Prerequisites

- A RHEL Pacemaker cluster with three or more nodes
- Root or sudo access

## Understanding Votes and Quorum

Each node has one vote by default. Quorum is achieved when more than half of the expected votes are present:

- 3 nodes: quorum = 2 (survives 1 failure)
- 5 nodes: quorum = 3 (survives 2 failures)
- 7 nodes: quorum = 4 (survives 3 failures)

## Checking Quorum Status

```bash
sudo corosync-quorumtool
```

Output:

```bash
Votequorum information
Expected votes:   3
Highest expected:  3
Total votes:       3
Quorum:            2
Flags:             Quorate
```

## Configuring Node Votes

By default, each node has one vote. You can assign different vote weights:

```bash
sudo corosync-cmapctl -s nodelist.node.0.quorum_votes u32 2
```

This gives node 0 two votes. Use this for nodes with higher reliability.

With pcs:

```bash
sudo pcs quorum update node1 votes=2
```

## Using a Quorum Device

A quorum device (qdevice) is a lightweight daemon that provides an additional vote. It runs on a separate server (not a cluster node) and casts a vote for one partition during a split.

### Install the Quorum Device Server

On a separate RHEL server:

```bash
sudo dnf install corosync-qnetd -y
sudo systemctl enable --now pcsd
sudo passwd hacluster
sudo pcs qdevice setup model net --enable --start
```

Open the firewall:

```bash
sudo firewall-cmd --permanent --add-service=high-availability
sudo firewall-cmd --reload
```

### Configure the Cluster to Use the Quorum Device

From a cluster node:

```bash
sudo pcs host auth qnetd-server -u hacluster
sudo pcs quorum device add model net host=qnetd-server algorithm=ffsplit
```

The `ffsplit` algorithm gives the vote to the partition with the most nodes. Alternative algorithm: `lms` (last man standing).

### Verify the Quorum Device

```bash
sudo pcs quorum device status
sudo pcs quorum status
```

## Quorum Device Algorithms

### ffsplit (Fifty-Fifty Split)

Gives the vote to the larger partition. Best for even-numbered clusters:

```bash
sudo pcs quorum device add model net host=qnetd-server algorithm=ffsplit
```

### lms (Last Man Standing)

Allows the cluster to continue as long as at least one node remains. Aggressive but flexible:

```bash
sudo pcs quorum device add model net host=qnetd-server algorithm=lms
```

## Configuring Quorum Options

### wait_for_all

Require all nodes to join before granting quorum on initial start:

```bash
sudo pcs quorum update wait_for_all=1
```

### last_man_standing

Dynamically recalculate quorum as nodes leave:

```bash
sudo pcs quorum update last_man_standing=1
sudo pcs quorum update last_man_standing_window=10000
```

### auto_tie_breaker

For even-numbered clusters without a quorum device:

```bash
sudo pcs quorum update auto_tie_breaker=1
```

## Removing a Quorum Device

```bash
sudo pcs quorum device remove
```

## Monitoring Quorum Changes

Watch quorum events in real time:

```bash
sudo corosync-quorumtool -m
```

Monitor cluster membership changes:

```bash
sudo corosync-cmapctl runtime.members
```

## Testing Quorum Loss

Simulate quorum loss by stopping nodes:

```bash
sudo pcs cluster stop node2
sudo pcs cluster stop node3
```

On node1, check quorum:

```bash
sudo corosync-quorumtool
```

Node1 should show "Not Quorate" and resources should stop (with the default no-quorum-policy).

Restart the stopped nodes:

```bash
sudo pcs cluster start node2
sudo pcs cluster start node3
```

## Conclusion

Quorum and voting in multi-node RHEL clusters prevent split-brain scenarios. Use quorum devices for even-numbered clusters, configure wait_for_all for safe startups, and test quorum behavior during maintenance. Proper quorum configuration is essential for production cluster reliability.
