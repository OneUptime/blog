# How to Use mysqladmin Utility in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Mysqladmin, Administration, Command Line, Utility

Description: Learn how to use the mysqladmin command-line utility to perform common MySQL administration tasks including status checks, password changes, and log flushing.

---

`mysqladmin` is a command-line utility that ships with MySQL and lets administrators perform common server management tasks without opening an interactive MySQL session. It is particularly useful for scripting and quick operational checks.

## Basic Syntax

```bash
mysqladmin [options] command [command-arg] [command [command-arg]] ...
```

Connection options follow the same pattern as `mysql`:

```bash
mysqladmin -u root -p -h 127.0.0.1 -P 3306 <command>
```

## Checking Server Liveness

The `ping` command tests whether MySQL is responding:

```bash
mysqladmin -u root -p ping
```

Output:

```text
mysqld is alive
```

## Getting a Quick Status Summary

```bash
mysqladmin -u root -p status
```

Output:

```text
Uptime: 864000  Threads: 5  Questions: 1284500  Slow queries: 12  Opens: 1450  Flush tables: 3  Open tables: 800  Queries per second avg: 1.485
```

For a more detailed view:

```bash
mysqladmin -u root -p extended-status
```

This outputs all global status variables, equivalent to `SHOW GLOBAL STATUS`.

## Checking Active Processes

```bash
mysqladmin -u root -p processlist
```

For full query text:

```bash
mysqladmin -u root -p --verbose processlist
```

## Killing a Process

```bash
mysqladmin -u root -p kill 12345
```

Kill multiple processes at once:

```bash
mysqladmin -u root -p kill 12345,67890
```

## Changing the Root Password

```bash
mysqladmin -u root -p password 'NewSecurePassword123!'
```

## Flushing Server State

Flush all logs (closes and reopens all log files, rotates binary logs):

```bash
mysqladmin -u root -p flush-logs
```

Flush tables and close/reopen log files:

```bash
mysqladmin -u root -p refresh
```

Close all open tables and flush the table cache:

```bash
mysqladmin -u root -p flush-tables
```

## Checking Server Variables

```bash
mysqladmin -u root -p variables
```

Filter with grep:

```bash
mysqladmin -u root -p variables | grep -E "max_connections|innodb_buffer"
```

## Graceful Shutdown

Stop the MySQL server:

```bash
mysqladmin -u root -p shutdown
```

## Reloading the Grant Tables

After manually editing user privileges, reload without restarting:

```bash
mysqladmin -u root -p reload
```

## Polling Status Over Time

The `--sleep` and `--count` flags poll a command repeatedly:

```bash
# Show status every 5 seconds, 10 times
mysqladmin -u root -p --sleep=5 --count=10 extended-status | grep -E "Threads_running|Slow_queries|Questions"
```

This is useful for watching how metrics change during a load test.

## Using a Credentials File

Avoid typing passwords in commands by storing credentials in `~/.my.cnf`:

```ini
[mysqladmin]
user = root
password = your_password
```

```bash
mysqladmin status
```

## Summary

`mysqladmin` provides a scriptable interface to the most common MySQL administration tasks: liveness checks with `ping`, status snapshots with `status` and `extended-status`, process management with `processlist` and `kill`, log rotation with `flush-logs`, and graceful shutdown. It is especially useful in monitoring scripts and automation pipelines where opening an interactive MySQL session is impractical.
