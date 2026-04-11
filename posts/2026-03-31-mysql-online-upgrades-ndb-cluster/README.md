# How to Perform Online Upgrades in MySQL NDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Upgrade, Rolling Restart, Maintenance

Description: Learn how to perform a rolling online upgrade of MySQL NDB Cluster without downtime by upgrading nodes sequentially while the cluster remains available.

---

## What is a Rolling Upgrade?

MySQL NDB Cluster supports online (rolling) upgrades, where each node is upgraded and restarted individually while the rest of the cluster continues to serve traffic. This ensures zero downtime during minor version upgrades and most patch upgrades. The upgrade order must follow the same sequence as startup: management nodes first, then data nodes (one per node group at a time), then SQL nodes.

## Prerequisites

- Download the new NDB Cluster packages for all nodes
- Verify the upgrade is supported (check MySQL release notes for cross-version compatibility)
- Take a cluster backup before starting

```bash
ndb_mgm -e "start backup"
```

## Upgrade Order

```text
1. Management nodes (ndb_mgmd)
2. Data nodes (one node group at a time - never two nodes in the same group simultaneously)
3. SQL nodes (mysqld)
```

## Step 1: Upgrade the Management Node

```bash
# Stop management node gracefully
ndb_mgm -e "1 stop"

# Install new package on management node host
sudo dpkg -i mysql-cluster-community-management-server_8.0.37-debian12-x86_64.deb

# Start management node
ndb_mgmd --config-file=/var/lib/mysql-cluster/config.ini
```

## Step 2: Upgrade Data Nodes

For a cluster with two node groups (nodes 2, 3 in group 0 and nodes 4, 5 in group 1):

**Upgrade node 2 (group 0, first node):**

```bash
# Stop node 2
ndb_mgm -e "2 stop"

# Install new packages on node 2 host
sudo dpkg -i mysql-cluster-community-data-node_8.0.37-debian12-x86_64.deb

# Restart node 2
ndbd
```

Wait for node 2 to rejoin:

```bash
ndb_mgm -e "2 status"
```

**Upgrade node 3 (group 0, second node) after node 2 is back:**

```bash
ndb_mgm -e "3 stop"
# Install new package on node 3 host
sudo dpkg -i mysql-cluster-community-data-node_8.0.37-debian12-x86_64.deb
ndbd
```

Repeat for nodes in group 1 (nodes 4 and 5).

## Step 3: Upgrade SQL Nodes

Upgrade SQL nodes one at a time. Remove each from load balancer rotation before upgrading:

```bash
# On the SQL node host
systemctl stop mysql
sudo dpkg -i mysql-cluster-community-server_8.0.37-debian12-x86_64.deb
systemctl start mysql
```

Re-add to load balancer and repeat for remaining SQL nodes.

## Verifying the Upgrade

After all nodes are upgraded, check versions:

```bash
ndb_mgm -e show
```

All nodes should show the new version:

```text
id=2    @192.168.1.11  (mysql-8.0.37 ndb-8.0.37, Nodegroup: 0, *)
```

From a SQL node:

```sql
SELECT @@version;
SHOW STATUS LIKE 'Ndb_cluster_node_id';
```

## Upgrade Rollback

If an issue is detected after upgrading one node, stop the upgraded node and reinstall the old package before proceeding further. NDB Cluster allows mixed versions temporarily to support rolling upgrades, but do not leave the cluster in a mixed-version state longer than necessary.

## Summary

MySQL NDB Cluster rolling upgrades allow zero-downtime version updates by cycling through nodes one at a time. Always upgrade the management node first, then data nodes (respecting node group boundaries), then SQL nodes. Take a backup before starting, verify each node rejoins the cluster before moving to the next, and confirm all nodes show the new version after completion.
