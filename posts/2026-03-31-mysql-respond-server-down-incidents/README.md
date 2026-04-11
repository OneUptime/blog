# How to Respond to MySQL Server Down Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Incident Response, Availability, Recovery, Troubleshooting

Description: Learn how to respond to a MySQL server down incident with a step-by-step runbook covering diagnosis, safe restart, data integrity checks, and post-incident review.

---

## Incident Detection

When MySQL is down, applications report connection errors. Common symptoms:
- `Can't connect to MySQL server on 'host' (111)`
- `Too many connections` (server overloaded before crash)
- Health check failures on port 3306

Check the server status immediately:

```bash
systemctl status mysql
# or on older systems:
service mysql status
```

## Step 1: Check MySQL Error Logs

The error log reveals why the server stopped:

```bash
tail -100 /var/log/mysql/error.log
# or
journalctl -u mysql -n 100 --no-pager
```

Look for keywords: `InnoDB: Fatal error`, `Out of memory`, `Aborted`, `Signal 6/11`.

## Step 2: Check System Resources

A crashed MySQL is often caused by resource exhaustion:

```bash
# Check disk space
df -h /var/lib/mysql

# Check available memory
free -m

# Check OOM killer events
dmesg | grep -i "oom\|killed" | tail -20

# Check open file limits
ulimit -n
```

## Step 3: Safe Restart Attempt

If no data corruption is indicated, attempt a clean restart:

```bash
systemctl restart mysql
```

Monitor the error log during restart:

```bash
tail -f /var/log/mysql/error.log
```

Watch for InnoDB recovery messages - a crash recovery is normal after an unclean shutdown:

```text
[Note] InnoDB: Starting crash recovery.
[Note] InnoDB: Restoring possible half-written data pages
[Note] InnoDB: Database was not shut down normally!
```

## Step 4: Verify After Restart

```sql
-- Check server is responding
SELECT VERSION(), NOW();

-- Check InnoDB status for errors
SHOW ENGINE INNODB STATUS\G

-- Check for crashed tables
SELECT table_schema, table_name, engine
FROM information_schema.tables
WHERE table_comment LIKE '%crashed%';

-- Check replication if applicable
SHOW REPLICA STATUS\G
```

## Step 5: Check Replication Lag

If the server is a replica, verify it has caught up after recovery:

```sql
SHOW REPLICA STATUS\G
-- Check: Seconds_Behind_Source, Replica_IO_Running, Replica_SQL_Running
```

## Step 6: Repair Corrupted Tables

For MyISAM tables, use `mysqlcheck` to auto-repair:

```bash
mysqlcheck --all-databases --auto-repair -u root -p
```

For specific MyISAM tables:

```sql
CHECK TABLE orders;
REPAIR TABLE orders;
```

Note: `REPAIR TABLE` only works for MyISAM, ARCHIVE, and CSV tables. If InnoDB tables are corrupted, you need to start the server with `innodb_force_recovery` and then dump and restore the data:

```bash
# In /etc/mysql/mysql.conf.d/mysqld.cnf, temporarily add:
# innodb_force_recovery = 1
# Then restart MySQL, dump data, and restore into a clean instance.
mysqldump --all-databases > backup.sql
```

## Post-Incident Actions

After recovery, prevent recurrence:

```bash
# Increase InnoDB buffer pool if OOM was the cause
# In /etc/mysql/mysql.conf.d/mysqld.cnf:
# innodb_buffer_pool_size = 4G

# Enable MySQL to start at boot
systemctl enable mysql

# To enable automatic restart on failure, ensure the systemd unit has:
# [Service]
# Restart=on-failure
# You can check with: systemctl cat mysql
```

Set up monitoring to alert before the next incident:

```sql
-- Check current connections vs max
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Threads_connected';
```

## Summary

Respond to a MySQL server down incident by checking error logs and system resources first, then attempting a safe restart. After restart, verify InnoDB recovery completed cleanly, check table integrity with `mysqlcheck`, and confirm replica status. Implement monitoring for disk space, memory, and connection counts to detect early warning signs before the next outage.
