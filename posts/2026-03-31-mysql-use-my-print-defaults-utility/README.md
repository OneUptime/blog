# How to Use my_print_defaults Utility in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Utility, Tool, Option File

Description: Learn how to use the my_print_defaults utility to read and display MySQL option file values for any program group, aiding configuration debugging.

---

## What is my_print_defaults?

`my_print_defaults` is a MySQL command-line utility that reads MySQL option files (`my.cnf`, `my.ini`, `~/.my.cnf`, and others) and prints the options that apply to a specific program group. It is useful for debugging configuration issues, verifying which settings a MySQL program will actually use at startup, and understanding option file precedence.

## Basic Usage

To display options that the `mysqld` server will read:

```bash
my_print_defaults mysqld
```

Example output:

```text
--datadir=/var/lib/mysql
--socket=/var/run/mysqld/mysqld.sock
--max_connections=500
--innodb_buffer_pool_size=2G
--slow_query_log=1
```

To check options for the MySQL client:

```bash
my_print_defaults client mysql
```

This prints combined options from both the `[client]` and `[mysql]` sections.

## Specifying a Custom Configuration File

Use `--defaults-file` to read from a specific file instead of the default search path:

```bash
my_print_defaults --defaults-file=/etc/mysql/custom.cnf mysqld
```

To also include the extra config file:

```bash
my_print_defaults --defaults-extra-file=/etc/mysql/extra.cnf mysqld
```

## Checking All Option File Locations

To see which files MySQL will search for options on your system:

```bash
my_print_defaults --help 2>&1 | grep -A5 "Default options"
```

Example output:

```text
Default options are read from the following files in the given order:
/etc/my.cnf /etc/mysql/my.cnf ~/.my.cnf
```

## Debugging a Specific Configuration Problem

If `mysqld` refuses to start, check exactly what options it sees:

```bash
my_print_defaults mysqld
```

To isolate which file a specific option comes from, use `--defaults-file` to read one file at a time:

```bash
my_print_defaults --defaults-file=/etc/mysql/my.cnf mysqld
my_print_defaults --defaults-file=/etc/mysql/conf.d/custom.cnf mysqld
```

By comparing the output from each file, you can determine where a conflicting or unexpected option is set.

## Checking mysqldump Options

Before running a backup, verify the options that `mysqldump` will use:

```bash
my_print_defaults mysqldump
```

Example output:

```text
--single-transaction=1
--routines
--host=127.0.0.1
```

## Verifying Replication Agent Options

For replication tools and agents defined in option files:

```bash
my_print_defaults mysqlbinlog
```

```text
--base64-output=AUTO
--verify-binlog-checksum
```

## Practical Option File Structure

A typical `/etc/mysql/my.cnf` that `my_print_defaults` will parse:

```text
[client]
port=3306
socket=/var/run/mysqld/mysqld.sock

[mysqld]
port=3306
datadir=/var/lib/mysql
max_connections=300
innodb_buffer_pool_size=1G

[mysqldump]
single-transaction
quick
```

Running `my_print_defaults client mysqld` against this file will merge and print both `[client]` and `[mysqld]` sections.

## Summary

`my_print_defaults` is a straightforward but powerful utility for inspecting MySQL configuration. Use it to verify option file precedence, debug startup failures caused by unexpected settings, and confirm that replication or backup tools pick up the correct configuration before running them in production.
