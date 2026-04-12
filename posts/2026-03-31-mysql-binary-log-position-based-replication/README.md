# How to Set Up Binary Log Position-Based Replication in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Binary Log, Configuration, Database

Description: Learn how to set up MySQL binary log position-based replication using file and position coordinates to connect a replica to a source server.

---

Binary log position-based replication is the traditional method for setting up MySQL replication. It uses a specific binary log filename and position offset to identify where the replica should start reading events from the source. While GTID-based replication is generally preferred for new setups, position-based replication remains widely used and is important to understand for managing legacy systems.

## Prerequisites

Both source and replica servers must have:
- Unique `server_id` values
- Binary logging enabled on the source
- Network connectivity between servers

## Configuring the Source Server

Edit `my.cnf` on the source:

```ini
[mysqld]
server_id = 1
log_bin = /var/lib/mysql/binlogs/mysql-bin
binlog_format = ROW
binlog_expire_logs_seconds = 604800
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
```

Restart MySQL and create a replication user:

```sql
CREATE USER 'repl_user'@'192.168.1.%' IDENTIFIED BY 'StrongReplPass123';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'192.168.1.%';
FLUSH PRIVILEGES;
```

## Taking a Consistent Snapshot

Take a snapshot of the source database while recording the binary log position:

```bash
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --source-data=2 \
  --flush-logs \
  > /tmp/source_snapshot.sql
```

The `--source-data=2` flag writes the binary log position as a comment:

```bash
head -50 /tmp/source_snapshot.sql | grep "CHANGE REPLICATION SOURCE"
```

Output:

```text
-- CHANGE REPLICATION SOURCE TO SOURCE_LOG_FILE='mysql-bin.000005', SOURCE_LOG_POS=157;
```

Note the filename and position values.

## Configuring the Replica Server

Edit `my.cnf` on the replica:

```ini
[mysqld]
server_id = 2
log_bin = /var/lib/mysql/binlogs/mysql-bin
relay_log = /var/lib/mysql/relaylogs/relay-bin
read_only = ON
super_read_only = ON
```

## Restoring the Snapshot on the Replica

```bash
mysql -u root -p < /tmp/source_snapshot.sql
```

## Connecting the Replica to the Source

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'StrongReplPass123',
  SOURCE_LOG_FILE = 'mysql-bin.000005',
  SOURCE_LOG_POS = 157;

START REPLICA;
```

## Verifying Replication

```sql
SHOW REPLICA STATUS\G
```

Look for these key values:

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
Seconds_Behind_Source: 0
Last_Error: (empty)
```

## Checking the Current Replication Position

On the source:

```sql
SHOW BINARY LOG STATUS;
```

On the replica:

```sql
SHOW REPLICA STATUS\G
-- Check: Relay_Source_Log_File and Exec_Source_Log_Pos
```

## Pausing and Resuming Replication

```sql
-- Stop replication
STOP REPLICA;

-- Restart replication
START REPLICA;

-- Stop only the SQL thread (apply thread)
STOP REPLICA SQL_THREAD;

-- Stop only the IO thread (fetch thread)
STOP REPLICA IO_THREAD;
```

## Verifying Data Consistency

After replication is established and lag reaches zero:

```sql
-- Compare row counts on source and replica
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'mydb';
```

## Summary

Binary log position-based replication requires recording the source log file and position at snapshot time, restoring the snapshot on the replica, and using `CHANGE REPLICATION SOURCE TO` with `SOURCE_LOG_FILE` and `SOURCE_LOG_POS` to connect the replica. Use `--source-data=2` with `mysqldump` to capture the position automatically. Monitor replication with `SHOW REPLICA STATUS` and verify `Replica_IO_Running` and `Replica_SQL_Running` are both `Yes` before considering the setup complete.
