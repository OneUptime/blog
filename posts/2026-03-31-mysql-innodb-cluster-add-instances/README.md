# How to Add Instances to a MySQL InnoDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB Cluster, MySQL Shell, High Availability, Cluster

Description: Use MySQL Shell to add new instances to an existing InnoDB Cluster, with automatic provisioning and state recovery for seamless cluster expansion.

---

## Prerequisites

Before adding an instance to an InnoDB Cluster, ensure:

- MySQL 8.0+ is installed on the new instance
- The instance is reachable on port 3306 and 33061 from all cluster members
- The instance has not previously been part of a cluster (clean state)

## Check Instance Compatibility

Connect to MySQL Shell and run a pre-check:

```javascript
// In MySQL Shell (mysqlsh)
shell.connect('admin@node1:3306')
var cluster = dba.getCluster()
dba.checkInstanceConfiguration('admin@node4:3306')
```

If the instance needs configuration changes, MySQL Shell will suggest them:

```text
Please use the dba.configureInstance() command to repair these issues.
```

## Configure the New Instance

```javascript
dba.configureInstance('admin@node4:3306')
```

MySQL Shell will prompt for the admin password and apply required settings such as GTID mode, binary logging, and performance schema configuration.

After configuration, restart MySQL on the new instance:

```bash
sudo systemctl restart mysql
```

## Add the Instance to the Cluster

Reconnect to Shell and add the new instance:

```javascript
shell.connect('admin@node1:3306')
var cluster = dba.getCluster()
cluster.addInstance('admin@node4:3306')
```

MySQL Shell will ask how to provision the new instance:

```text
Please select a recovery method [C]lone/[I]ncremental recovery/[A]bort (default Clone):
```

- **Clone** - uses MySQL Clone plugin to copy the dataset (recommended for large datasets)
- **Incremental recovery** - replays binary logs (faster for recently added instances)

## Monitor the Recovery Progress

```javascript
cluster.status()
```

```text
{
    "clusterName": "myCluster",
    "defaultReplicaSet": {
        "status": "OK",
        "topology": {
            "node1:3306": {"status": "ONLINE", "memberRole": "PRIMARY", "mode": "R/W"},
            "node2:3306": {"status": "ONLINE", "memberRole": "SECONDARY", "mode": "R/O"},
            "node3:3306": {"status": "ONLINE", "memberRole": "SECONDARY", "mode": "R/O"},
            "node4:3306": {"status": "RECOVERING", "memberRole": "SECONDARY", "mode": "R/O"}
        }
    }
}
```

Wait for node4 to show `"status": "ONLINE"` before directing traffic to it.

## Verify the Instance Was Added

```javascript
cluster.status({extended: true})
```

Check the `defaultReplicaSet.topology` section to confirm all expected members are listed and ONLINE.

## Add Instance with Custom Options

You can customize the addition with options:

```javascript
cluster.addInstance('admin@node4:3306', {
  recoveryMethod: 'clone',
  label: 'node4-replica',
  waitRecovery: 2  // 0=no wait, 1=wait but no output, 2=wait with progress
})
```

## MySQL Router and New Instances

MySQL Router automatically detects topology changes through its metadata cache, so adding a new instance does not require a Router restart or re-bootstrap. The Router will begin routing connections to the new member once it is ONLINE and the metadata cache refreshes (controlled by the `ttl` setting, which defaults to 0.5 seconds).

If Router was bootstrapped with an older version or you need to reconfigure it, you can re-bootstrap:

```bash
mysqlrouter --bootstrap admin@node1:3306 --user=mysqlrouter --force
```

## Summary

Add instances to a MySQL InnoDB Cluster using `cluster.addInstance()` in MySQL Shell. Run `dba.checkInstanceConfiguration()` and `dba.configureInstance()` first to ensure the new server meets requirements. Choose between Clone (for large datasets) or incremental recovery (for small catch-up). Monitor progress with `cluster.status()`. MySQL Router automatically detects the new member through its metadata cache.
