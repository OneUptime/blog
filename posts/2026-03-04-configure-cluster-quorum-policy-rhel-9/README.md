# How to Configure a Cluster Quorum Policy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Quorum, Pacemaker, Corosync, High Availability, Cluster, Linux

Description: Learn how to configure cluster quorum policies on RHEL to prevent split-brain scenarios and ensure proper cluster operation during node failures.

---

Quorum determines whether a cluster has enough nodes to safely operate. On RHEL, the Corosync votequorum system tracks votes from each node and requires a majority to maintain quorum. Proper quorum configuration prevents split-brain scenarios where both halves of a split cluster try to run resources.

## Prerequisites

- A RHEL Pacemaker cluster
- Root or sudo access

## Understanding Quorum

In a cluster with N nodes, quorum requires more than N/2 votes:

- 2 nodes: Needs 2 votes (special handling required)
- 3 nodes: Needs 2 votes (survives 1 failure)
- 4 nodes: Needs 3 votes (survives 1 failure)
- 5 nodes: Needs 3 votes (survives 2 failures)

## Checking Quorum Status

View the current quorum status:

```bash
sudo pcs quorum status
```

View quorum configuration:

```bash
sudo pcs quorum config
```

Use Corosync tools directly:

```bash
sudo corosync-quorumtool
```

## Two-Node Cluster Quorum

Two-node clusters cannot achieve a majority when one node fails (1 out of 2 is not a majority). RHEL handles this with the `two_node` option:

```bash
sudo pcs quorum config
```

The `two_node: 1` setting is automatically applied and enables:

- `wait_for_all` - Both nodes must be present before the cluster starts
- Special quorum handling that allows one node to continue

## Configuring wait_for_all

Force the cluster to wait for all nodes on initial startup:

```bash
sudo pcs quorum update wait_for_all=1
```

This prevents the first node to start from running resources before all nodes have joined, avoiding a race condition.

## Configuring last_man_standing

Allow quorum to adjust dynamically as nodes leave:

```bash
sudo pcs quorum update last_man_standing=1
```

With this enabled, if a 5-node cluster loses 2 nodes, the expected votes adjust to 3 and quorum requires 2. This allows the cluster to survive additional failures.

## Configuring auto_tie_breaker

For even-numbered clusters, auto_tie_breaker resolves ties:

```bash
sudo pcs quorum update auto_tie_breaker=1
```

When exactly half the nodes fail, the partition containing the node with the lowest node ID retains quorum.

## Setting Expected Votes

Override the expected votes count (use with caution):

```bash
sudo corosync-quorumtool -e 3
```

This is a temporary runtime change used during planned maintenance.

## Quorum Policy: What Happens Without Quorum

Configure the cluster behavior when quorum is lost:

```bash
# Stop all resources when quorum is lost (default)
sudo pcs property set no-quorum-policy=stop

# Freeze resources (do not start or stop anything)
sudo pcs property set no-quorum-policy=freeze

# Ignore quorum (dangerous, can cause split-brain)
sudo pcs property set no-quorum-policy=ignore

# Suicide (fence the remaining nodes)
sudo pcs property set no-quorum-policy=suicide
```

### Recommended Policies

- **stop** (default) - Safest for most clusters
- **freeze** - Good when stopping resources is more dangerous than split-brain
- **ignore** - Only for two-node clusters with proper fencing
- **suicide** - When it is better to fence yourself than risk split-brain

## Verifying Quorum During Maintenance

Before taking a node offline for maintenance, check if quorum will be maintained:

```bash
# Check current quorum status
sudo corosync-quorumtool

# Verify expected votes and current votes
sudo pcs quorum status
```

If removing a node would lose quorum, adjust expected votes first:

```bash
sudo pcs quorum expected-votes 2
```

## Conclusion

Quorum configuration on RHEL is critical for preventing split-brain scenarios. Use the default `stop` policy for most deployments, configure `two_node` for two-node clusters, and test quorum behavior during planned maintenance before relying on it during emergencies.
