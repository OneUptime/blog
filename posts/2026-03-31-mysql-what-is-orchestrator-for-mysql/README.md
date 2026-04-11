# What Is Orchestrator for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Orchestrator, Replication, High Availability, Failover, Topology

Description: Orchestrator is an open-source MySQL replication topology manager that provides automated failover, topology visualization, and safe replication refactoring.

---

## Overview

Orchestrator is a MySQL replication topology manager and high-availability tool developed originally at GitHub and now part of the Vitess ecosystem. It provides a visual web UI and powerful CLI for managing complex MySQL replication topologies, detecting failures, and automating or semi-automating failover events.

## Key Capabilities

- **Topology visualization** - interactive web UI showing replication relationships
- **Automated failover** - promotes a replica to primary when the primary fails
- **Safe topology changes** - refactoring replicas (moving between primaries) without breaking replication
- **Anti-split-brain** - prevents two nodes from thinking they are both primary
- **Hooks** - customizable scripts for pre/post failover actions (updating ProxySQL, DNS, etc.)

## Architecture

```text
                    Orchestrator (HTTP :3000)
                         |
              +----------+----------+
              |                     |
        MySQL Primary         MySQL Replicas
        (monitors via          (tracks topology
       replication status       and health)
         commands)
```

Orchestrator connects directly to all MySQL instances it manages and builds a live topology map.

## Installation

```bash
# Download and install
wget https://github.com/openark/orchestrator/releases/download/v3.2.6/orchestrator-3.2.6-linux-amd64.tar.gz
tar xzf orchestrator-3.2.6-linux-amd64.tar.gz
mv orchestrator /usr/local/bin/
mv orchestrator-client /usr/local/bin/

# Create orchestrator's own backend database
mysql -u root -p -e "CREATE DATABASE orchestrator;"
```

## Configuration

Create `/etc/orchestrator.conf.json`:

```json
{
  "Debug": false,
  "ListenAddress": ":3000",
  "MySQLTopologyUser": "orchestrator",
  "MySQLTopologyPassword": "orchpass",
  "MySQLOrchestratorHost": "127.0.0.1",
  "MySQLOrchestratorPort": 3306,
  "MySQLOrchestratorDatabase": "orchestrator",
  "MySQLOrchestratorUser": "orchestrator",
  "MySQLOrchestratorPassword": "orchpass",
  "RecoverMasterClusterFilters": ["*"],
  "RecoverIntermediateMasterClusterFilters": ["*"],
  "FailMasterPromotionOnLagMinutes": 1,
  "DetachLostReplicasAfterMasterFailover": true,
  "ApplyMySQLPromotionAfterMasterFailover": true,
  "OnFailureDetectionProcesses": [
    "echo 'Failure detected: {failureType} on {failedHost}' >> /var/log/orchestrator-events.log"
  ],
  "PostMasterFailoverProcesses": [
    "/usr/local/bin/update-proxysql.sh {successorHost} {successorPort}"
  ]
}
```

## MySQL User for Orchestrator

```sql
-- Create orchestrator user on all MySQL instances
CREATE USER 'orchestrator'@'orchestrator-host' IDENTIFIED BY 'orchpass';
GRANT SUPER, PROCESS, REPLICATION SLAVE, RELOAD ON *.* TO 'orchestrator'@'orchestrator-host';
GRANT SELECT ON mysql.slave_master_info TO 'orchestrator'@'orchestrator-host';
GRANT SELECT ON performance_schema.replication_group_members TO 'orchestrator'@'orchestrator-host';
FLUSH PRIVILEGES;
```

## Discovering Your Topology

```bash
# Discover an instance (Orchestrator crawls the replication tree)
orchestrator-client -c discover -i primary-host:3306

# View the current topology
orchestrator-client -c topology -i primary-host:3306
```

```text
primary-host:3306   [0s lag] [last check: 0s ago]
+ replica-1:3306    [1s lag] [last check: 1s ago]
+ replica-2:3306    [1s lag] [last check: 1s ago]
  + replica-3:3306  [2s lag] [last check: 2s ago]   (replica of replica-2)
```

## Manual Failover Operations

```bash
# Gracefully move a replica under a different primary
orchestrator-client -c relocate -i replica-3:3306 -d replica-1:3306

# Promote a specific replica to primary (planned switchover)
orchestrator-client -c graceful-master-takeover -i primary-host:3306 -d replica-1:3306

# Force failover (emergency - primary is dead)
orchestrator-client -c recover -i primary-host:3306
```

## Automated Failover Hooks

Orchestrator supports hooks at every stage of a failover:

```bash
# /usr/local/bin/update-proxysql.sh
#!/bin/bash
NEW_PRIMARY_HOST=$1
NEW_PRIMARY_PORT=$2

mysql -h 127.0.0.1 -P 6032 -u admin -padmin <<EOF
UPDATE mysql_servers SET hostgroup_id = 20
WHERE hostgroup_id = 10;

UPDATE mysql_servers SET hostgroup_id = 10
WHERE hostname = '${NEW_PRIMARY_HOST}' AND port = ${NEW_PRIMARY_PORT};

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
EOF

echo "ProxySQL updated: new primary is ${NEW_PRIMARY_HOST}:${NEW_PRIMARY_PORT}"
```

## Web UI

Start Orchestrator and access the topology dashboard:

```bash
orchestrator --config /etc/orchestrator.conf.json http

# Access at http://your-server:3000
```

The web UI shows real-time replication lag, server health, and allows drag-and-drop topology refactoring.

## Preventing Split-Brain with Raft Mode

For production deployments, run Orchestrator in Raft mode for consensus-based leader election:

```json
{
  "RaftEnabled": true,
  "RaftBind": "10.0.1.20",
  "RaftDataDir": "/var/lib/orchestrator",
  "DefaultRaftPort": 10008,
  "RaftNodes": [
    "10.0.1.20:10008",
    "10.0.1.21:10008",
    "10.0.1.22:10008"
  ]
}
```

## Summary

Orchestrator is the standard tool for managing MySQL replication topology at scale. It provides a visual, queryable map of your replication setup, automates failover with customizable hooks for updating proxies and DNS, and enables safe topology refactoring without risking data loss. For production MySQL deployments beyond a single primary, Orchestrator paired with ProxySQL provides a robust, battle-tested high-availability stack.
