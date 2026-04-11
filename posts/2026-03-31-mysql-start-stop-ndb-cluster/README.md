# How to Start and Stop MySQL NDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Operation, Management, Startup

Description: Learn the correct order and commands for starting and stopping a MySQL NDB Cluster safely, including graceful shutdown and individual node control.

---

## Startup Order

NDB Cluster nodes must be started in a specific order. Starting nodes out of order will cause them to wait for other nodes or fail to join the cluster:

```text
1. Management node (ndb_mgmd) - must start first
2. Data nodes (ndbd / ndbmtd) - start after management node
3. SQL nodes (mysqld) - start last after data nodes are running
```

## Step 1: Start the Management Node

On the management node host (first time, to load the initial configuration):

```bash
ndb_mgmd --initial --config-file=/var/lib/mysql-cluster/config.ini
```

On subsequent starts (configuration is cached):

```bash
systemctl start ndb_mgmd
```

Verify it is running:

```bash
ndb_mgm -e show
```

Data and SQL nodes will show as `not connected, accepting connect`.

## Step 2: Start Data Nodes

On each data node host:

```bash
# Start the data node
ndbd

# Or for multi-threaded nodes
ndbmtd
```

> **Warning:** The `ndbd --initial` flag erases all data node files and redo logs. It is not needed for first-time startup. Only use `--initial` when performing a software upgrade that changes file formats, or as a last resort when normal restarts fail repeatedly.

Using systemd:

```bash
systemctl start ndbd
```

Wait for data nodes to reach `started` state before proceeding:

```bash
ndb_mgm -e show
```

## Step 3: Start SQL Nodes

On each SQL node host:

```bash
systemctl start mysql
```

Verify all nodes are connected:

```bash
ndb_mgm -e show
```

All nodes should show as connected with version information.

## Full Cluster Status

```bash
ndb_mgm
ndb_mgm> show
ndb_mgm> all status
```

## Graceful Cluster Shutdown

Shut down in reverse order - SQL nodes first, then data nodes, then management node:

```bash
# Stop SQL nodes first
systemctl stop mysql   # on each SQL node host

# Graceful shutdown of all data and management nodes
ndb_mgm -e shutdown
```

The `shutdown` command in `ndb_mgm` stops all data nodes and the management node gracefully.

## Stopping Individual Data Nodes

To stop a specific data node (node ID 2) without shutting down the cluster:

```bash
ndb_mgm -e "2 stop"
```

## Restarting a Data Node Online

```bash
# Restart node 2 without stopping the cluster
ndb_mgm -e "2 restart"

# Force restart even if it would result in an incomplete cluster
ndb_mgm -e "2 restart -f"
```

## Stopping an Individual SQL Node

```bash
systemctl stop mysql   # on the specific SQL node host
```

The remaining SQL nodes continue serving traffic.

## Starting the Cluster After Full Shutdown

After a complete shutdown, restart in the standard order:

```bash
# 1. Management node
systemctl start ndb_mgmd

# 2. Data nodes (on each host)
ndbd   # or ndbmtd

# 3. SQL nodes (on each host)
systemctl start mysql
```

## Summary

Always start the management node first, then data nodes, then SQL nodes. For shutdown, reverse this order and use `ndb_mgm -e shutdown` to stop data and management nodes gracefully. Use `ndb_mgm -e show` at each step to verify node connectivity before proceeding to the next stage.
