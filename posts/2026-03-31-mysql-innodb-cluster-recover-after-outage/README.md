# How to Recover a MySQL InnoDB Cluster After a Full Outage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB Cluster, Recovery, Disaster Recovery, MySQL Shell

Description: Step-by-step guide to recovering a MySQL InnoDB Cluster after all nodes go offline simultaneously, including safe restart order and quorum restoration.

---

## What Is a Full Cluster Outage

A full cluster outage occurs when all InnoDB Cluster members go offline simultaneously. This can happen due to:

- A data center power failure
- Simultaneous OS patches requiring reboots
- A network switch failure affecting all nodes

Unlike a partial outage where the healthy majority continues, a full outage leaves no node with quorum. The cluster must be manually restarted.

## Step 1 - Start MySQL on All Nodes

Start the MySQL service on each server without starting group replication:

```bash
sudo systemctl start mysql
```

Group replication should NOT start automatically. Verify this:

```bash
# Check that group_replication is stopped
mysql -u root -p -e "SELECT MEMBER_STATE FROM performance_schema.replication_group_members;"
```

If it returns a single row with `MEMBER_STATE = 'OFFLINE'`, group replication has not started, which is correct.

## Step 2 - Identify the Most Up-to-Date Node

Check which node has the highest GTID set (applied the most transactions):

```sql
SELECT @@global.gtid_executed;
```

Run this on all nodes and compare the outputs. The node with the largest GTID set should be used to bootstrap the cluster.

## Step 3 - Restore the Cluster from MySQL Shell

Connect to MySQL Shell on the most current node:

```javascript
shell.connect('admin@node1:3306')
dba.rebootClusterFromCompleteOutage()
```

MySQL Shell will ask which nodes to include in the rejoin process:

```text
You are going to reboot the cluster from complete outage.

Restoring the cluster 'myCluster' from complete outage...

Rejoining instances to the cluster...
```

## Step 4 - Rejoin Remaining Nodes

If `dba.rebootClusterFromCompleteOutage()` does not automatically rejoin all nodes, add them manually:

```javascript
var cluster = dba.getCluster()
cluster.rejoinInstance('admin@node2:3306')
cluster.rejoinInstance('admin@node3:3306')
```

## Step 5 - Verify Cluster Health

```javascript
cluster.status()
```

```text
{
    "status": "OK",
    "topology": {
        "node1:3306": {"status": "ONLINE", "memberRole": "PRIMARY"},
        "node2:3306": {"status": "ONLINE", "memberRole": "SECONDARY"},
        "node3:3306": {"status": "ONLINE", "memberRole": "SECONDARY"}
    }
}
```

All members should show `ONLINE`.

## Handling a Diverged Member

If a node applied transactions that were never certified by the group (diverged), it cannot rejoin:

```text
ERROR: instance 'node3:3306' is diverged. Please remove it from the cluster.
```

Remove the diverged node, then re-add it with fresh data:

```javascript
cluster.removeInstance('admin@node3:3306', {force: true})
cluster.addInstance('admin@node3:3306')
```

## Prevent Full Outages

Enable `group_replication_start_on_boot = OFF` on all nodes and use an orchestration tool (systemd, Kubernetes) to control startup order. Configure your monitoring to alert immediately when member count drops below quorum.

```bash
# Check current configuration
mysql -e "SHOW VARIABLES LIKE 'group_replication_start_on_boot';"
```

## Summary

To recover a MySQL InnoDB Cluster after a full outage, start MySQL on all nodes, identify the most current node using `gtid_executed`, and run `dba.rebootClusterFromCompleteOutage()` from MySQL Shell. Rejoin any missed nodes using `cluster.rejoinInstance()`. Remove and re-add any diverged instances. Monitor with `cluster.status()` until all members return to `ONLINE`.
