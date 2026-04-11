# How to Monitor MySQL NDB Cluster with ndb_mgm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Monitoring, ndb_mgm, Management

Description: Learn how to use the ndb_mgm management client to monitor MySQL NDB Cluster node status, memory usage, and cluster events in real time.

---

## What is ndb_mgm?

`ndb_mgm` is the MySQL NDB Cluster management client that connects to the management node and provides an interactive console for monitoring and controlling the cluster. It allows you to check node status, view memory usage, inspect events, and perform management operations without restarting the cluster.

## Connecting to the Management Node

```bash
# Connect to local management node on default port 1186
ndb_mgm

# Connect to a remote management node
ndb_mgm -c 192.168.1.10:1186
```

## Checking Cluster Status

```bash
ndb_mgm> show
```

Example output:

```text
Cluster Configuration
---------------------
[ndbd(NDB)]     2 node(s)
id=2    @192.168.1.11  (mysql-8.0.36 ndb-8.0.36, Nodegroup: 0, *)
id=3    @192.168.1.12  (mysql-8.0.36 ndb-8.0.36, Nodegroup: 0)

[ndb_mgmd(MGM)] 1 node(s)
id=1    @192.168.1.10  (mysql-8.0.36 ndb-8.0.36)

[mysqld(API)]   2 node(s)
id=4    @192.168.1.13  (mysql-8.0.36 ndb-8.0.36)
id=5    @192.168.1.14  (mysql-8.0.36 ndb-8.0.36)
```

## Checking Individual Node Status

```bash
ndb_mgm> all status
```

This shows detailed status for each data node including phase and state.

## Monitoring Memory Usage

```bash
ndb_mgm> all report memory
```

Example output:

```text
Node 2: Data usage is 34%(342 32K pages of total 1024)
Node 2: Index usage is 12%(49 8K pages of total 393)
Node 3: Data usage is 34%(342 32K pages of total 1024)
Node 3: Index usage is 12%(49 8K pages of total 393)
```

Alert when either metric exceeds 75-80%.

## Viewing Recent Events

```bash
ndb_mgm> ALL REPORT EventLog
```

To execute this as a one-line command from the shell, use the `-e` (`--execute`) flag:

```bash
ndb_mgm -e "ALL REPORT EventLog" -c 192.168.1.10
```

To monitor events in real time, run `ndb_mgm` interactively. Cluster events are displayed in the console as they occur. Use `CLUSTERLOG INFO` to view current log filter settings and `CLUSTERLOG FILTER <severity>` to toggle event severity levels.

## Checking Backup Status

```bash
ndb_mgm> ALL REPORT BackupStatus
```

## One-Line Commands (Non-Interactive)

For scripting and monitoring automation:

```bash
# Check show output
ndb_mgm -e show -c 192.168.1.10

# Check memory
ndb_mgm -e "all report memory" -c 192.168.1.10

# Check a specific node
ndb_mgm -e "2 status" -c 192.168.1.10
```

## Monitoring via SQL (ndbinfo Database)

The `ndbinfo` database provides cluster metrics through SQL:

```sql
USE ndbinfo;

-- Node status
SELECT node_id, status FROM nodes;

-- Memory usage
SELECT node_id, memory_type, used, total
FROM memoryusage;

-- Inter-node transporter statistics
SELECT * FROM transporters;
```

## Setting Up a Monitoring Script

```bash
#!/bin/bash
MGMHOST=192.168.1.10

# Get data memory usage percentage
ndb_mgm -e "all report memory" -c $MGMHOST | grep "Data usage" | while read line; do
  PCT=$(echo $line | grep -oP '\d+(?=%)')
  if [ "$PCT" -gt 80 ]; then
    echo "WARNING: NDB Data memory usage at ${PCT}%" | mail -s "NDB Alert" ops@example.com
  fi
done
```

## Summary

`ndb_mgm` is the primary tool for NDB Cluster monitoring. Use `show` for a quick health check, `all report memory` to watch memory pressure, and the `ndbinfo` SQL database for detailed per-node metrics. Automate memory usage checks with cron scripts and alert before memory exceeds 80% to prevent data node crashes.
