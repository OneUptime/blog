# How to Handle NDB Cluster Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Failover, High Availability, Recovery

Description: Learn how MySQL NDB Cluster handles automatic failover when data nodes or SQL nodes fail, and how to recover manually when needed.

---

## How NDB Cluster Failover Works

MySQL NDB Cluster provides automatic failover for both data nodes and SQL nodes. With `NoOfReplicas=2`, each data fragment has two copies stored on different data nodes. If one data node fails, the surviving replica in the same node group continues serving reads and writes without interruption. Applications connected to other SQL nodes are unaffected.

## Data Node Failover

When a data node fails, NDB automatically promotes the surviving node in the same node group:

```bash
# Simulate a data node failure by stopping node 2
ndb_mgm -e "2 stop"

# Check cluster status
ndb_mgm -e show
```

Output shows the surviving node has taken over:

```text
[ndbd(NDB)]     2 node(s)
id=2    not connected
id=3    @192.168.1.12  (mysql-8.0.36 ndb-8.0.36, Nodegroup: 0, *)
```

The `*` on node 3 indicates it is now the active master for this node group.

## Verifying Data Access During Failover

From a SQL node, confirm queries still work while node 2 is down:

```sql
SELECT COUNT(*) FROM mydb.orders;
SELECT * FROM mydb.customers WHERE id = 1;
```

Both should return results immediately.

## Recovering a Failed Data Node

After fixing the underlying issue (hardware, OS, etc.), restart the failed data node:

```bash
# On the data node host - do NOT use --initial on an existing node
ndbd

# Or with systemd
systemctl start ndbd
```

The node rejoins and synchronizes its data from the surviving replica automatically. This may take several minutes for large datasets.

## Monitoring Recovery Progress

```bash
ndb_mgm -e "2 status"
```

During synchronization:

```text
Node 2: starting (Last completed phase 4) (mysql-8.0.36 ndb-8.0.36)
```

After full recovery:

```text
Node 2: started (mysql-8.0.36 ndb-8.0.36)
```

## SQL Node Failover

SQL nodes are stateless - they do not hold data. If a SQL node fails, applications must reconnect to another SQL node. Use a load balancer (HAProxy or ProxySQL) to handle SQL node failover automatically:

```text
frontend mysql
  bind *:3306
  default_backend mysql_nodes

backend mysql_nodes
  option mysql-check user haproxy_check
  server sql1 192.168.1.13:3306 check
  server sql2 192.168.1.14:3306 check backup
```

## Management Node Failover

If the management node fails, existing cluster operations continue uninterrupted - data and SQL nodes cache their configuration. However, new nodes cannot join until the management node is restored.

Restart the management node after resolving the issue:

```bash
ndb_mgmd --config-file=/var/lib/mysql-cluster/config.ini --reload
```

## Preventing False Failovers

Tune heartbeat intervals to avoid triggering failover on transient network issues:

```text
[ndbd default]
HeartbeatIntervalDbDb=15000
HeartbeatIntervalDbApi=15000
```

## Summary

NDB Cluster handles data node failures automatically through its replica mechanism - no manual intervention is needed for applications. After fixing the underlying cause, restart the failed node without `--initial` to allow it to resync from the surviving replica. Use a load balancer in front of SQL nodes to provide transparent failover at the application connection layer, and monitor recovery progress with `ndb_mgm -e "node_id status"`.
