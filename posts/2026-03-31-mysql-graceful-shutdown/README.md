# How to Handle MySQL Graceful Shutdown

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Shutdown, Administration, InnoDB, Operation

Description: Learn how to perform a graceful MySQL shutdown that flushes buffers, completes active transactions, and ensures clean recovery on the next startup.

---

## What Is a Graceful MySQL Shutdown?

A graceful MySQL shutdown allows the server to:
- Complete or roll back active transactions
- Flush the InnoDB buffer pool dirty pages to disk
- Close all open connections cleanly
- Write a clean shutdown marker to the redo log

This contrasts with a forced shutdown (kill -9 on mysqld), which requires InnoDB crash recovery on the next startup and increases startup time significantly.

## Initiating a Graceful Shutdown

The standard way to shut down MySQL gracefully on Linux:

```bash
systemctl stop mysql
```

This sends SIGTERM to mysqld, which initiates a clean shutdown sequence. For MariaDB:

```bash
systemctl stop mariadb
```

You can also use mysqladmin:

```bash
mysqladmin -u root -p shutdown
```

## Controlling Shutdown Behavior

By default, MySQL waits for active transactions to complete. Configure what cleanup operations InnoDB performs during shutdown:

```ini
[mysqld]
innodb_fast_shutdown = 1
```

`innodb_fast_shutdown` values:
- **0** - Full purge and change buffer merge before shutdown (slowest, cleanest)
- **1** - Default: skip full purge and change buffer merge (fast, safe)
- **2** - Flush only redo log (fastest, requires crash recovery on next start)

For normal shutdowns, use the default (1). Use 0 before major upgrades to ensure the tablespace is fully clean.

## Monitoring Shutdown Progress

During shutdown, MySQL logs progress to the error log:

```bash
tail -f /var/log/mysql/error.log
```

You will see messages like:

```text
[System] [MY-011825] [InnoDB] Starting shutdown...
[System] [MY-011826] [InnoDB] Shutdown of InnoDB complete
[System] [MY-010910] [Server] /usr/sbin/mysqld: Shutdown complete
```

For a large buffer pool, flushing dirty pages can take several minutes.

## Pre-Shutdown Best Practices

Before shutting down a production MySQL server:

**1. Enable super_read_only to prevent new writes:**

```sql
SET GLOBAL super_read_only = ON;
```

**2. Check for active long-running transactions:**

```sql
SELECT trx_id, trx_started, trx_query, trx_state
FROM information_schema.INNODB_TRX
WHERE TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 5;
```

Wait for or kill long transactions before proceeding.

**3. On a replica, stop replication first:**

```sql
STOP REPLICA;
```

## InnoDB Buffer Pool Dump Before Shutdown

To reduce warm-up time after restart, dump the buffer pool state before shutting down:

```sql
SET GLOBAL innodb_buffer_pool_dump_now = ON;
```

Or configure automatic dump on shutdown and load on startup:

```ini
[mysqld]
innodb_buffer_pool_dump_at_shutdown = ON
innodb_buffer_pool_load_at_startup = ON
innodb_buffer_pool_dump_pct = 25
```

This persists the list of recently accessed pages so MySQL can reload them on startup, reducing cold-start query latency.

## Forcing Shutdown When Graceful Fails

If MySQL does not shut down within the expected time:

```bash
# Check current state
systemctl status mysql

# Wait longer for graceful shutdown (e.g., large buffer pool flushing)
# Only force if absolutely necessary:
systemctl kill -s SIGKILL mysql
```

A forced kill means crash recovery on next startup. Monitor the error log during recovery:

```bash
journalctl -u mysql -f
```

## Summary

Handle MySQL graceful shutdown by using `systemctl stop mysql` or `mysqladmin shutdown`, setting `innodb_fast_shutdown = 1` for normal shutdowns, and enabling `innodb_buffer_pool_dump_at_shutdown` to accelerate warm-up after restart. Before shutdown, set `super_read_only = ON`, verify no long transactions are running, and stop replication on replicas. Only force-kill mysqld as a last resort.
