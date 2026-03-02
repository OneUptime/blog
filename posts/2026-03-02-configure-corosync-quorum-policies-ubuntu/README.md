# How to Configure Corosync Quorum Policies on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, High Availability, Corosync, Clustering, Quorum

Description: Learn how to configure Corosync quorum policies on Ubuntu to control cluster behavior during network partitions and node failures in high availability environments.

---

Quorum is the mechanism that determines whether a cluster partition has enough members to make decisions and manage resources. Without quorum, a cluster refuses to run services to avoid the split-brain scenario where two independent cluster partitions both try to manage the same resources. Understanding how Corosync calculates quorum and how to configure quorum policies correctly is fundamental to building reliable high availability clusters.

## What Is Quorum?

In a cluster of N nodes, quorum typically requires more than N/2 nodes to be reachable. In a three-node cluster, quorum requires two nodes. In a five-node cluster, quorum requires three nodes.

When a cluster loses quorum - say a network partition splits a five-node cluster into groups of two and three - the group of two loses quorum and stops managing resources, while the group of three retains quorum and continues (or takes over) managing resources. This prevents both sides from managing resources simultaneously.

The complication arises with two-node clusters, where any single node failure means neither side has majority. Corosync handles this case specially.

## Viewing Current Quorum Status

```bash
# Check quorum status
sudo corosync-quorumtool -s

# Check detailed quorum information
sudo corosync-quorumtool -v

# Check status from pcs
sudo pcs quorum status
```

Sample output from `corosync-quorumtool -s`:

```
Quorum information
------------------
Date:             Mon Mar  2 10:00:00 2026
Quorum provider:  corosync_votequorum
Nodes:            2
Node ID:          1
Ring ID:          1.4
Quorate:          Yes

Votequorum information
----------------------
Expected votes:   2
Highest expected: 2
Total votes:      2
Quorum:           1
Flags:            2Node Quorate

Membership information
----------------------
    Nodeid      Votes    Qdevice Name
         1          1         NV node1 (local)
         2          1         NV node2
```

## Corosync Configuration File

The quorum configuration lives in `/etc/corosync/corosync.conf`:

```bash
# View the current corosync configuration
sudo cat /etc/corosync/corosync.conf
```

A typical configuration looks like:

```
totem {
    version: 2
    cluster_name: ha-cluster
    transport: knet
    crypto_cipher: aes256
    crypto_hash: sha256
}

nodelist {
    node {
        ring0_addr: 192.168.1.10
        name: node1
        nodeid: 1
    }
    node {
        ring0_addr: 192.168.1.11
        name: node2
        nodeid: 2
    }
}

quorum {
    provider: corosync_votequorum
    two_node: 1
}

logging {
    to_logfile: yes
    logfile: /var/log/corosync/corosync.log
    to_syslog: yes
}
```

## Two-Node Cluster Quorum

For two-node clusters, set `two_node: 1` in the quorum section. This tells Corosync that a single node can form a quorum (since you cannot have majority of two without one being able to proceed):

```bash
# Configure two-node quorum via pcs
sudo pcs quorum update two_node=1

# Or configure via pcs for the Pacemaker no-quorum-policy
sudo pcs property set no-quorum-policy=ignore
```

The `two_node: 1` setting in Corosync is the preferred approach. The `no-quorum-policy=ignore` is a Pacemaker-level setting that tells Pacemaker to ignore quorum loss, which is less precise.

## Quorum Votes and Expected Votes

You can assign custom vote values to nodes, which is useful when you want certain nodes to carry more weight:

```bash
# Set expected votes manually
sudo corosync-quorumtool -e 3

# Set votes for a specific node
sudo corosync-quorumtool -n 2 -v 2
```

In the configuration file, assign votes per node:

```
nodelist {
    node {
        ring0_addr: 192.168.1.10
        name: node1
        nodeid: 1
        quorum_votes: 2
    }
    node {
        ring0_addr: 192.168.1.11
        name: node2
        nodeid: 2
        quorum_votes: 1
    }
}

quorum {
    provider: corosync_votequorum
    expected_votes: 3
}
```

With this setup, node1 alone can form quorum (2 out of 3 expected votes).

## Quorum Device (QDevice)

A quorum device is a third-party tiebreaker - a separate process running on a machine outside the cluster that can cast a deciding vote in split-brain scenarios:

```bash
# Install quorum device package on the qdevice host (NOT a cluster node)
sudo apt install -y corosync-qdevice corosync-qnetd

# On the qnetd host, initialize the qnetd
sudo corosync-qnetd-certutil -i

# Start the qnetd service
sudo systemctl enable --now corosync-qnetd

# On the cluster nodes, add the qdevice
sudo pcs quorum device add model net \
  host=qdevice-host.example.com \
  algorithm=lms

# Verify qdevice is connected
sudo corosync-quorumtool -s
```

The `algorithm=lms` means "last man standing" - the side with the most recent communication with the qdevice wins.

## Pacemaker No-Quorum Policy

Pacemaker has its own policy for what to do when quorum is lost:

```bash
# Show current no-quorum-policy
sudo pcs property show no-quorum-policy

# Available options:
# ignore  - continue managing resources regardless of quorum
# freeze  - stop changing resource state but don't stop resources
# stop    - stop all resources (safest, default)
# demote  - demote promotable resources (for DRBD clusters)
# suicide - fence the local node (with STONITH configured)

# Set to stop (default and recommended for multi-node clusters)
sudo pcs property set no-quorum-policy=stop

# Set to ignore for two-node clusters without a qdevice
sudo pcs property set no-quorum-policy=ignore
```

## Testing Quorum Behavior

Understanding how the cluster behaves when quorum is lost is important:

```bash
# Watch quorum status in real time
watch -n1 corosync-quorumtool -s

# In another terminal, simulate a node failure by putting it on standby
sudo pcs node standby node2

# Or stop corosync on node2 (from node2)
sudo systemctl stop corosync

# Observe the quorum status change on node1
sudo corosync-quorumtool -s
```

## Configuring Quorum Timeout

The `token` timeout controls how long Corosync waits before declaring a node dead:

```bash
# Edit corosync.conf
sudo nano /etc/corosync/corosync.conf
```

Add to the totem section:

```
totem {
    version: 2
    cluster_name: ha-cluster
    transport: knet

    # Token timeout in ms - how long before a node is declared dead
    token: 10000

    # Token retransmit timeout
    token_retransmits_before_loss_const: 10

    # Join timeout - how long to wait for join messages
    join: 60

    # Consensus timeout
    consensus: 12000

    crypto_cipher: aes256
    crypto_hash: sha256
}
```

After editing, reload Corosync:

```bash
# Apply configuration changes (restarts corosync on all nodes)
sudo pcs cluster reload corosync

# Or manually on each node
sudo systemctl reload corosync
```

## Quorum in Three-Node Clusters

Three-node clusters are often the recommended minimum for production because they can tolerate one node failure while maintaining quorum:

```
quorum {
    provider: corosync_votequorum
    # No two_node setting - standard majority quorum
    # 3 nodes, quorum = 2
}
```

With three nodes, if one node fails, the remaining two still form a majority. If a network partition splits it 1+2, the group of two keeps quorum and the single node steps down.

## Monitoring Quorum Events

```bash
# Check corosync logs for quorum events
sudo journalctl -u corosync | grep -i quorum

# View quorum ring status
sudo corosync-cfgtool -s

# Check for quorum loss events
sudo grep -i "quorum" /var/log/corosync/corosync.log

# View pacemaker response to quorum events
sudo journalctl -u pacemaker | grep -i quorum
```

Quorum configuration is one of those topics where the right answer depends on your specific cluster size and environment. For two-node clusters, use `two_node: 1` in Corosync with a qdevice if you can provision one. For three or more nodes, standard majority quorum works well without special configuration. Always test quorum behavior before putting a cluster into production by intentionally stopping nodes and verifying the cluster responds as expected.
