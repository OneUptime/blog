# How to Troubleshoot MySQL Router Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Router, Troubleshooting, Connection, InnoDB Cluster

Description: Diagnose and fix common MySQL Router issues including connection failures, routing errors, metadata cache staleness, and port binding problems.

---

## Enable Debug Logging

The first step in troubleshooting is to increase the MySQL Router log level:

```ini
# /etc/mysqlrouter/mysqlrouter.conf
[logger]
level = DEBUG
```

Restart Router and check the log:

```bash
sudo systemctl restart mysqlrouter
tail -f /var/log/mysqlrouter/mysqlrouter.log
```

## Issue: Router Cannot Connect to MySQL Cluster

**Symptom:** Clients get `Can't connect to MySQL server` when connecting through Router.

**Diagnosis:**

```bash
# Check if router is running
sudo systemctl status mysqlrouter

# Check if ports are listening
ss -tlnp | grep mysqlrouter

# Test direct connection to backend
mysql -h node1 -P 3306 -u admin -p -e "SELECT 1"
```

**Fix - Verify metadata cache is configured:**

```ini
[metadata_cache:myCluster]
cluster_type = gr
router_id = 1
user = mysqlrouter
metadata_cluster = myCluster
ttl = 0.5
```

## Issue: All Traffic Goes to Primary, Ignoring Replicas

**Symptom:** The read-only port routes to the primary instead of secondaries.

**Diagnosis:**

```sql
-- Check member roles on cluster
SELECT MEMBER_HOST, MEMBER_ROLE, MEMBER_STATE
FROM performance_schema.replication_group_members;
```

If all members show as `PRIMARY`, the cluster may be in multi-primary mode. Check the routing configuration:

```ini
[routing:myCluster_ro]
destinations = metadata-cache://myCluster/?role=SECONDARY
```

In multi-primary mode, there are no SECONDARY members. Change to:

```ini
destinations = metadata-cache://myCluster/?role=PRIMARY_AND_SECONDARY
```

## Issue: Metadata Cache Is Stale

**Symptom:** Router continues sending traffic to a failed node after failover.

**Diagnosis:**

```bash
# Check TTL setting
grep ttl /etc/mysqlrouter/mysqlrouter.conf
```

**Fix:** Reduce the metadata TTL for faster failover detection:

```ini
[metadata_cache:myCluster]
ttl = 0.5
```

The default TTL is 0.5 seconds. If you increased it for performance reasons, a failover will take up to `ttl` seconds longer to be detected.

## Issue: Router Fails to Bootstrap

**Symptom:** `mysqlrouter --bootstrap` returns an error about missing privileges.

**Fix:** Grant the required privileges to the bootstrap user:

```sql
CREATE USER 'admin'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON mysql_innodb_cluster_metadata.* TO 'admin'@'%';
GRANT SELECT ON mysql.* TO 'admin'@'%';
GRANT SELECT ON performance_schema.replication_group_members TO 'admin'@'%';
GRANT SELECT ON performance_schema.replication_group_member_stats TO 'admin'@'%';
FLUSH PRIVILEGES;
```

Or use MySQL Shell to create a router account with the correct minimal privileges:

```javascript
var cluster = dba.getCluster();
cluster.setupRouterAccount('admin@%');
```

## Issue: Router Port Already in Use

**Symptom:** Router fails to start with `bind: address already in use`.

**Diagnosis:**

```bash
ss -tlnp | grep :6446
```

**Fix:** Change the bind port or stop the conflicting process:

```ini
[routing:myCluster_rw]
bind_port = 3307
```

## Issue: Client Gets Intermittent Errors After Failover

**Symptom:** After a primary failover, some connections get errors for a few seconds.

**Explanation:** During failover, Router detects the topology change and drops connections to the old primary. Active transactions are terminated.

**Fix:** Configure your application to retry on connection loss:

```python
import mysql.connector
from mysql.connector import errorcode

for attempt in range(3):
    try:
        cursor.execute("INSERT INTO events VALUES (%s, %s)", (event_id, data))
        conn.commit()
        break
    except mysql.connector.Error as e:
        if e.errno in (errorcode.CR_SERVER_LOST, errorcode.CR_SERVER_GONE_ERROR):
            conn.reconnect()
            cursor = conn.cursor()
        else:
            raise
```

## Summary

Troubleshoot MySQL Router by enabling `DEBUG` logging, verifying backend connectivity, and checking metadata cache TTL. Common issues include stale metadata after failover (reduce TTL to 0.5), wrong role in routing destination for multi-primary clusters, and insufficient bootstrap privileges. Configure application retry logic to handle brief connection disruptions during failover.
