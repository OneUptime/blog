# How to Monitor MySQL InnoDB Cluster Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB Cluster, Monitoring, MySQL Shell, Health

Description: Monitor MySQL InnoDB Cluster health using MySQL Shell cluster.status(), Performance Schema, and shell scripts for automated alerting.

---

## Check Cluster Status with MySQL Shell

The primary tool for monitoring InnoDB Cluster health is the `cluster.status()` command in MySQL Shell:

```javascript
shell.connect('admin@node1:3306')
var cluster = dba.getCluster()
cluster.status()
```

Sample output:

```text
{
    "clusterName": "myCluster",
    "defaultReplicaSet": {
        "name": "default",
        "primary": "node1:3306",
        "ssl": "REQUIRED",
        "status": "OK",
        "statusText": "Cluster is ONLINE and can tolerate up to ONE failure.",
        "topology": {
            "node1:3306": {
                "address": "node1:3306",
                "memberRole": "PRIMARY",
                "mode": "R/W",
                "readReplicas": {},
                "status": "ONLINE"
            },
            "node2:3306": {
                "address": "node2:3306",
                "memberRole": "SECONDARY",
                "mode": "R/O",
                "status": "ONLINE"
            },
            "node3:3306": {
                "address": "node3:3306",
                "memberRole": "SECONDARY",
                "mode": "R/O",
                "status": "ONLINE"
            }
        }
    }
}
```

The top-level `"status": "OK"` means the cluster is healthy and can tolerate one failure.

## Extended Status for Deeper Diagnostics

```javascript
cluster.status({extended: true})
```

This includes:
- Group Replication member UUIDs
- Recovery channel state
- Transaction queue depths
- Certification conflicts

## Monitor from SQL

You can also monitor directly from SQL without MySQL Shell:

```sql
-- Member health
SELECT MEMBER_HOST, MEMBER_ROLE, MEMBER_STATE
FROM performance_schema.replication_group_members;

-- Transaction queue depth per member
SELECT
  MEMBER_ID,
  COUNT_TRANSACTIONS_IN_QUEUE AS queue,
  COUNT_CONFLICTS_DETECTED AS conflicts
FROM performance_schema.replication_group_member_stats;
```

## Create a Monitoring Script

Use this shell script to check cluster health and send an alert:

```bash
#!/bin/bash
STATUS=$(mysqlsh --uri admin:secret@node1:3306 --js --execute \
  "var c = dba.getCluster(); print(c.status().defaultReplicaSet.status)" 2>/dev/null)

if [ "$STATUS" != "OK" ]; then
  echo "ALERT: InnoDB Cluster status is $STATUS"
  # Integrate with your alerting system here
  curl -X POST https://oneuptime.example.com/alert \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"InnoDB Cluster status: $STATUS\"}"
fi
```

## Check for Quorum Loss

```javascript
// In MySQL Shell
cluster.status().defaultReplicaSet.status
// "OK" - healthy
// "OK_NO_TOLERANCE" - running but cannot tolerate any failures
// "NO_QUORUM" - cluster lost quorum, writes blocked
// "OFFLINE" - all members offline
```

## Monitor Replication Lag

```sql
-- Check how far behind each secondary is
SELECT
  m.MEMBER_HOST,
  s.COUNT_TRANSACTIONS_REMOTE_IN_APPLIER_QUEUE AS applier_queue
FROM performance_schema.replication_group_member_stats s
JOIN performance_schema.replication_group_members m
  ON s.MEMBER_ID = m.MEMBER_ID
ORDER BY applier_queue DESC;
```

## Check InnoDB Cluster Metadata

```sql
-- Connect to any member and check cluster metadata
USE mysql_innodb_cluster_metadata;
SELECT cluster_name, description
FROM clusters;

SELECT instance_id, address, mysql_server_uuid
FROM instances;
```

## Summary

Monitor MySQL InnoDB Cluster using `cluster.status()` in MySQL Shell for a quick overview, and `cluster.status({extended: true})` for detailed diagnostics. For automated monitoring, query `performance_schema.replication_group_members` via scripts and alert when status is not `OK`. Integrate with OneUptime to create on-call workflows triggered by cluster health degradation.
