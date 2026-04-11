# How to Scale MySQL with Read Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Scaling, Read Replica, Performance

Description: Learn how to scale MySQL read capacity by adding read replicas, routing read queries to replicas, and monitoring replication lag for consistent performance.

---

## Why Read Replicas Scale MySQL

MySQL read replicas (also called read slaves or standby replicas) are copies of your primary database that receive changes asynchronously via binary log replication. By directing all SELECT queries to one or more replicas, you free the primary server to handle only writes, dramatically increasing total read throughput without upgrading hardware.

A single primary can support multiple replicas. Each replica independently follows the primary's binary log, so adding more replicas scales read capacity nearly linearly for read-heavy workloads.

## Setting Up a Read Replica

On the primary, enable binary logging and assign a unique server ID in `my.cnf`:

```ini
[mysqld]
server_id = 1
log_bin = mysql-bin
binlog_format = ROW
```

Create a replication user on the primary:

```sql
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'strong_password';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
FLUSH PRIVILEGES;
```

Note the current binary log file and position:

```sql
SHOW MASTER STATUS;
```

On the replica server, set a different server ID in `my.cnf`:

```ini
[mysqld]
server_id = 2
relay_log = relay-bin
read_only = ON
```

Configure replication on the replica:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '10.0.0.1',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'strong_password',
  SOURCE_LOG_FILE = 'mysql-bin.000001',
  SOURCE_LOG_POS = 154;

START REPLICA;
```

Verify replication is running:

```sql
SHOW REPLICA STATUS\G
```

Look for `Replica_IO_Running: Yes` and `Replica_SQL_Running: Yes`.

## Routing Reads to Replicas

At the application level, maintain two connection pools - one for writes pointing to the primary, one for reads pointing to the replica:

```python
import mysql.connector

# Write connection - goes to primary
write_conn = mysql.connector.connect(
    host="10.0.0.1", user="app", password="secret", database="mydb"
)

# Read connection - goes to replica
read_conn = mysql.connector.connect(
    host="10.0.0.2", user="app", password="secret", database="mydb"
)

def get_user(user_id):
    cursor = read_conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    return cursor.fetchone()

def create_user(name, email):
    cursor = write_conn.cursor()
    cursor.execute("INSERT INTO users (name, email) VALUES (%s, %s)", (name, email))
    write_conn.commit()
```

For more sophisticated routing, use ProxySQL or MySQL Router to handle the routing layer automatically.

## Monitoring Replication Lag

The key metric for read replicas is `Seconds_Behind_Source`. If this grows, reads from replicas may return stale data:

```sql
-- On the replica
SHOW REPLICA STATUS\G
```

Query replication status and errors using Performance Schema:

```sql
SELECT CHANNEL_NAME, SERVICE_STATE, LAST_ERROR_NUMBER, LAST_ERROR_MESSAGE
FROM performance_schema.replication_applier_status_by_coordinator;
```

Set up an alert if lag exceeds your application's staleness tolerance (e.g., 5 seconds for a reporting workload, under 1 second for transactional reads).

## Handling Read-After-Write Consistency

After a write, immediately reading from a replica may return stale data. Mitigate this by:
- Reading from the primary for the user's own writes for a brief window
- Using semi-synchronous replication to reduce lag
- Using session-level routing to send reads to the primary immediately after writes

```sql
-- Enable semi-sync on primary for reduced lag
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';
SET GLOBAL rpl_semi_sync_source_enabled = ON;
```

## Summary

Read replicas scale MySQL read capacity by distributing SELECT queries across multiple servers. Set up asynchronous replication with binary logging, route reads to replicas using your application's connection logic or a proxy layer, and monitor `Seconds_Behind_Source` to detect lag. For read-after-write consistency, consider semi-synchronous replication or primary fallback routing.
