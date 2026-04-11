# What Is the Relay Log in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Relay Log, Replication, Binary Log, Replica

Description: The MySQL relay log is a set of log files on a replica server that stores events received from the source binary log before they are applied by the SQL thread.

---

## Overview

The relay log is a critical component of MySQL replication. When a replica server connects to a source (primary) server, a dedicated I/O thread reads events from the source's binary log and writes them into the relay log on the replica. A separate SQL thread (also called the applier thread) then reads from the relay log and applies those events to the replica's data.

This two-step process - receive into relay log, then apply from relay log - decouples the network reception of events from their execution, allowing the replica to keep up with the source even when applying events takes time.

## Relay Log File Structure

Relay log files are named following a pattern like:

```text
hostname-relay-bin.000001
hostname-relay-bin.000002
hostname-relay-bin.index
```

The `.index` file tracks all relay log files currently in use. Relay log files are binary files, similar in format to binary log files.

## Viewing Relay Log Status

On the replica, use `SHOW REPLICA STATUS` (MySQL 8.0.22+) or `SHOW SLAVE STATUS` (older versions):

```sql
SHOW REPLICA STATUS\G
```

Key fields related to the relay log:

```text
Relay_Log_File: hostname-relay-bin.000003
Relay_Log_Pos: 4152
Relay_Source_Log_File: source-bin.000015
Exec_Source_Log_Pos: 4152
Seconds_Behind_Source: 0
```

## Relay Log Configuration

Control relay log behavior in `my.cnf` on the replica:

```text
[mysqld]
relay-log = /var/lib/mysql/relay-bin
relay-log-index = /var/lib/mysql/relay-bin.index
relay_log_purge = ON
relay_log_recovery = ON
max_relay_log_size = 512M
```

`relay_log_purge = ON` automatically deletes relay log files once the SQL thread has fully applied them. This prevents disk space from filling up.

## Relay Log Recovery

`relay_log_recovery = ON` is important for crash safety. With this setting enabled, if the replica crashes, MySQL discards any unprocessed relay log files and re-fetches the necessary events from the source binary log. This ensures the replica resumes from a consistent state.

## Reading the Relay Log

You can read relay log contents with the `mysqlbinlog` tool (relay logs use the same format as binary logs):

```bash
mysqlbinlog /var/lib/mysql/relay-bin.000003
```

## Monitoring Relay Log Events

```sql
SHOW RELAYLOG EVENTS IN 'hostname-relay-bin.000003' LIMIT 20;
```

## Difference Between Binary Log and Relay Log

| Aspect | Binary Log | Relay Log |
|---|---|---|
| Location | Source server | Replica server |
| Written by | Source SQL execution | I/O thread from source |
| Read by | Replica I/O thread | Replica SQL thread |
| Retention | Manual or binlog_expire_logs_seconds | Auto-purged after apply |

## Summary

The relay log acts as an intermediate buffer in MySQL replication, bridging the binary log on the source and the actual data changes applied on the replica. Understanding the relay log is essential for diagnosing replication lag, recovering from replica crashes, and configuring replication for high availability setups. Enabling `relay_log_recovery` and `relay_log_purge` together provides a robust, self-healing replica configuration.