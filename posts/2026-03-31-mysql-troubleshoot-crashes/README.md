# How to Troubleshoot MySQL Crashes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Crash, InnoDB, Core Dump, Troubleshooting

Description: Learn how to diagnose MySQL crashes by analyzing error logs, core dumps, and crash patterns to identify whether the cause is a bug, corruption, or resource exhaustion.

---

## Detecting a Crash

MySQL crashes result in an unexpected shutdown and automatic restart (if configured). Signs include:

- Application errors reporting lost connections
- `systemctl status mysql` showing recent restarts
- Error log entries with `mysqld got signal` or `Aborted`

Check recent crash history:

```bash
journalctl -u mysql --since "24 hours ago" | grep -iE "crash|signal|aborted|killed"
tail -300 /var/log/mysql/error.log | grep -iE "crash|signal|aborted|killed|oom"
```

## Reading the Error Log

A typical crash entry looks like:

```text
2025-03-30T08:22:15.123456Z 0 [ERROR] [MY-013183] [InnoDB] Assertion failure: ...
2025-03-30T08:22:15.456789Z 0 [ERROR] mysqld got signal 11 ;
This could be, for instance, a memory corruption, an attempt to access freed memory...
```

Key signals:
- Signal 11 (SIGSEGV): segmentation fault, often memory corruption or a bug
- Signal 6 (SIGABRT): assertion failure inside MySQL
- Signal 9 (SIGKILL): the OOM killer terminated the process

## Checking for OOM Kills

The Linux OOM killer kills processes when memory is exhausted:

```bash
dmesg | grep -i "oom\|killed process" | tail -20
journalctl -k | grep -i "oom killer"
```

If MySQL is OOM-killed, reduce `innodb_buffer_pool_size` or add more RAM:

```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf
innodb_buffer_pool_size = 2G  # Reduce if system has < 8G RAM
```

## Enabling Core Dumps

Core dumps capture the state at crash time and help diagnose the root cause:

```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
core-file

# Allow core dumps system-wide
ulimit -c unlimited
echo '/tmp/core-%e-%p-%t' > /proc/sys/kernel/core_pattern
```

After a crash with a core dump:

```bash
gdb /usr/sbin/mysqld /tmp/core-mysqld-*
(gdb) bt full
```

## Identifying Crashing Queries

If MySQL crashes when executing specific queries, the error log often shows the query text. Enable the general log temporarily to capture all queries:

```sql
SET GLOBAL general_log = ON;
SET GLOBAL general_log_file = '/tmp/mysql_general.log';
```

Disable it promptly - it produces large log files under load.

## Checking for Table Corruption

Corruption can trigger crashes. After recovery, check tables:

```sql
CHECK TABLE orders EXTENDED;
```

Or use `mysqlcheck`:

```bash
mysqlcheck -u root -p --all-databases --check
```

## Upgrading MySQL

Many crash bugs are fixed in minor versions. Check the current version and patch notes:

```sql
SELECT VERSION();
```

```bash
# Ubuntu/Debian
apt-get update && apt-get upgrade mysql-server
```

## Enabling Crash Safe Replication Settings

Crashes during replication can corrupt relay logs. Enable these settings to survive crashes:

```bash
relay_log_recovery          = ON
sync_binlog                 = 1
innodb_flush_log_at_trx_commit = 1
```

## Summary

MySQL crash diagnosis starts with the error log and `dmesg` for OOM kills. OOM kills require memory reduction or hardware upgrade. SIGSEGV and SIGABRT crashes often indicate a MySQL bug - enabling core dumps and upgrading to the latest patch version is the first response. Check for table corruption after any crash. Use `relay_log_recovery = ON` to prevent replication issues after replica crashes.
