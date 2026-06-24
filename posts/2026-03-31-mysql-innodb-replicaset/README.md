# How to Use MySQL InnoDB ReplicaSet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB ReplicaSet, Replication, MySQL Shell, High Availability

Description: Learn how to create and manage a MySQL InnoDB ReplicaSet using MySQL Shell for simplified asynchronous replication with automated failover support.

---

## What Is InnoDB ReplicaSet

MySQL InnoDB ReplicaSet is a simpler alternative to InnoDB Cluster. It uses standard MySQL asynchronous replication (GTID-based) rather than Group Replication. InnoDB ReplicaSet provides:

- A single primary source accepting writes
- One or more read replicas
- MySQL Shell management interface
- MySQL Router integration for read/write splitting

Use InnoDB ReplicaSet when you need a managed replication setup without the complexity of Group Replication, or when automatic failover is not required.

## Prerequisites

- MySQL 8.0+ on all instances
- GTIDs enabled
- MySQL Shell installed

## Configure Each Instance

```ini
# my.cnf on each server
[mysqld]
gtid_mode = ON
enforce_gtid_consistency = ON
log_bin = mysql-bin
binlog_format = ROW
log_replica_updates = ON
```

## Create the ReplicaSet

Connect to MySQL Shell and configure the primary instance:

```javascript
shell.connect('admin@primary:3306')
dba.configureReplicaSetInstance()
```

Restart MySQL if prompted, then create the ReplicaSet:

```javascript
shell.connect('admin@primary:3306')
var rs = dba.createReplicaSet('myReplicaSet')
```

## Add Replica Instances

Configure and add each replica:

```javascript
dba.configureReplicaSetInstance('admin@replica1:3306')
// Restart replica1 if needed, then:

rs.addInstance('admin@replica1:3306')
rs.addInstance('admin@replica2:3306')
```

Choose the provisioning method when prompted:

```text
Please select a recovery method [C]lone/[I]ncremental recovery/[A]bort:
```

## Check ReplicaSet Status

```javascript
rs.status()
```

```text
{
    "replicaSet": {
        "name": "myReplicaSet",
        "primary": "primary:3306",
        "status": "AVAILABLE",
        "topology": {
            "primary:3306": {"status": "ONLINE", "instanceRole": "PRIMARY"},
            "replica1:3306": {"status": "ONLINE", "instanceRole": "SECONDARY"},
            "replica2:3306": {"status": "ONLINE", "instanceRole": "SECONDARY"}
        }
    }
}
```

## Perform a Switchover

To gracefully switch the primary to another instance:

```javascript
rs.setPrimaryInstance('replica1:3306')
```

This promotes `replica1` and reconfigures the old primary as a replica.

## Force a Failover

If the primary is unavailable:

```javascript
rs.forcePrimaryInstance('replica1:3306')
```

After the original primary recovers, rejoin it:

```javascript
rs.rejoinInstance('admin@primary:3306')
```

## Integrate with MySQL Router

Bootstrap MySQL Router to route traffic using the ReplicaSet:

```bash
mysqlrouter --bootstrap admin@primary:3306 \
  --user=mysqlrouter
sudo systemctl start mysqlrouter
```

Router creates ports:
- `6446` - read/write (routes to primary)
- `6447` - read-only (routes to replicas)

## InnoDB ReplicaSet vs InnoDB Cluster

| Feature | ReplicaSet | InnoDB Cluster |
|---------|-----------|----------------|
| Replication | Asynchronous | Virtually Synchronous (Group Replication) |
| Auto-failover | No (manual) | Yes |
| Write consistency | Eventual | Strong |
| Setup complexity | Lower | Higher |
| Use case | Read scaling | HA with consistency |

## Summary

MySQL InnoDB ReplicaSet provides a MySQL Shell-managed asynchronous replication topology. Create it with `dba.createReplicaSet()`, add replicas with `rs.addInstance()`, and monitor with `rs.status()`. Use `rs.setPrimaryInstance()` for planned switchovers and `rs.forcePrimaryInstance()` for emergency failover. It is simpler than InnoDB Cluster but does not provide automatic failover.
