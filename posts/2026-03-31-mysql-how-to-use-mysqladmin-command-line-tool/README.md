# How to Use mysqladmin Command-Line Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Administration, Mysqladmin, Command Line, Server Management

Description: Learn how to use the mysqladmin command-line tool to manage MySQL server status, flush operations, and administrative tasks without connecting to the MySQL shell.

---

## What Is mysqladmin

`mysqladmin` is a command-line administration utility that lets you perform server management tasks directly from the shell without entering the MySQL interactive client. Common tasks include checking server status, flushing caches, reloading configurations, and managing connections.

It ships with every MySQL installation.

## Basic Syntax

```bash
mysqladmin [options] command [command-options]
```

## Check Server Status

Verify the server is running and get basic stats:

```bash
mysqladmin -u root -p status
```

Sample output:

```text
Uptime: 86400  Threads: 5  Questions: 12345  Slow queries: 2  Opens: 120  Flush tables: 1  Open tables: 80  Queries per second avg: 0.143
```

## Detailed Server Status

Use `extended-status` for all status variables:

```bash
mysqladmin -u root -p extended-status
```

Filter with grep:

```bash
mysqladmin -u root -p extended-status | grep -i "queries\|threads\|connections"
```

## Show Server Variables

```bash
mysqladmin -u root -p variables
```

Filter for specific settings:

```bash
mysqladmin -u root -p variables | grep max_connections
```

## Ping the Server

Test if the server is running and accepting connections:

```bash
mysqladmin -u root -p ping
```

Returns `mysqld is alive` on success, or an error if the server is down.

## Check MySQL Version

```bash
mysqladmin -u root -p version
```

Output includes the server version, protocol version, connection info, and uptime.

## List Running Processes

```bash
mysqladmin -u root -p processlist
```

Shows all active client connections and queries. Use `--verbose` for full query text:

```bash
mysqladmin -u root -p --verbose processlist
```

## Kill a Running Query or Connection

Use the process ID from `processlist` to kill a connection:

```bash
mysqladmin -u root -p kill 42
```

Kill multiple connections at once:

```bash
mysqladmin -u root -p kill 42,43,44
```

## Flush Operations

Flush various server caches and logs:

```bash
# Flush all privileges (after manual grant changes)
mysqladmin -u root -p flush-privileges

# Flush all tables
mysqladmin -u root -p flush-tables

# Flush binary logs (rotates to a new log file)
mysqladmin -u root -p flush-logs

# Flush status counters
mysqladmin -u root -p flush-status

# Flush thread cache
mysqladmin -u root -p flush-threads
```

## Reload Configuration

Reload the grant tables without restarting the server:

```bash
mysqladmin -u root -p reload
```

This is equivalent to `FLUSH PRIVILEGES`.

## Create and Drop a Database

```bash
mysqladmin -u root -p create new_database
mysqladmin -u root -p drop old_database
```

`drop` prompts for confirmation.

## Shutdown the MySQL Server

```bash
mysqladmin -u root -p shutdown
```

This sends a clean shutdown signal to the server.

## Monitor Status Repeatedly

Use `--sleep` to run a command repeatedly at intervals (useful for monitoring):

```bash
# Run status every 5 seconds
mysqladmin -u root -p --sleep=5 status
```

Combine with `--count` to run a fixed number of times:

```bash
mysqladmin -u root -p --sleep=2 --count=10 extended-status | grep Threads_running
```

## Debug Output

Print debug information about the server's memory and thread usage:

```bash
mysqladmin -u root -p debug
```

This writes information to the MySQL error log.

## Common Options

| Option | Purpose |
|--------|---------|
| `-u user` | MySQL username |
| `-p` | Prompt for password |
| `-h host` | Remote server hostname |
| `-P port` | Server port |
| `--sleep=N` | Repeat command every N seconds |
| `--count=N` | Repeat command N times |
| `--verbose` | More detailed output |
| `--connect-timeout=N` | Timeout for connection attempts |

## Scripting with mysqladmin

A health check script that alerts when the server is unreachable:

```bash
#!/bin/bash
if ! mysqladmin -u monitor -p"$MYSQL_PASSWORD" ping --connect-timeout=3 > /dev/null 2>&1; then
  echo "ALERT: MySQL server is not responding" | mail -s "MySQL Down" ops@example.com
fi
```

## Check Replication Status

While `mysqladmin` does not show full replica details, you can check if a replica is running:

```bash
mysqladmin -u root -p extended-status | grep -E "Slave|Replica"
```

For full details, use `SHOW REPLICA STATUS\G` inside the MySQL client.

## Summary

`mysqladmin` provides a convenient shell interface for common MySQL server administration tasks without logging into the MySQL client. It is especially useful in scripts for health checks, scheduled cache flushes, and monitoring loops. Key commands include `status`, `processlist`, `flush-logs`, `ping`, and `shutdown`.
