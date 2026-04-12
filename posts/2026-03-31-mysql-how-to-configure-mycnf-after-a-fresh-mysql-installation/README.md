# How to Configure my.cnf After a Fresh MySQL Installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, My.cnf, Configuration, Database Tuning, Server Setup

Description: Configure my.cnf after installing MySQL to set character encoding, memory limits, connections, and logging for a production-ready server.

---

## Locating the my.cnf File

MySQL reads its configuration from `my.cnf` (Linux/macOS) or `my.ini` (Windows). The file location varies by platform and installation method:

```bash
# Check which config files MySQL actually reads
mysql --help | grep -A 1 "Default options"
```

Common locations:

```text
/etc/my.cnf                         (CentOS/RHEL)
/etc/mysql/my.cnf                   (Debian/Ubuntu)
/opt/homebrew/etc/my.cnf            (macOS Homebrew, Apple Silicon)
/usr/local/etc/my.cnf               (macOS Homebrew, Intel)
C:\ProgramData\MySQL\MySQL Server 8.0\my.ini   (Windows)
```

If the file does not exist, create it:

```bash
sudo touch /etc/my.cnf
```

## Configuration File Structure

The `my.cnf` file is divided into sections. Each section applies settings to a specific MySQL component:

```text
[mysqld]        - MySQL server settings
[client]        - MySQL client tools
[mysql]         - MySQL CLI client
[mysqldump]     - mysqldump utility
```

Most tuning is done under `[mysqld]`.

## Essential Settings After Installation

Here is a recommended baseline `my.cnf` for a fresh installation:

```text
[mysqld]
# General settings
user                    = mysql
pid-file                = /var/run/mysqld/mysqld.pid
socket                  = /var/run/mysqld/mysqld.sock
datadir                 = /var/lib/mysql

# Network
bind-address            = 127.0.0.1
port                    = 3306
max_connections         = 150

# Character set
character-set-server    = utf8mb4
collation-server        = utf8mb4_unicode_ci

# InnoDB
innodb_buffer_pool_size = 512M
innodb_log_file_size    = 128M
innodb_flush_log_at_trx_commit = 1
innodb_file_per_table   = 1

# Logging
slow_query_log          = 1
slow_query_log_file     = /var/log/mysql/slow.log
long_query_time         = 2
log_error               = /var/log/mysql/error.log

# Binary log (required for replication)
log_bin                 = /var/log/mysql/mysql-bin.log
binlog_format           = ROW
binlog_expire_logs_seconds = 604800

[client]
default-character-set   = utf8mb4

[mysql]
default-character-set   = utf8mb4
```

## Tuning InnoDB Buffer Pool

The `innodb_buffer_pool_size` is the most important tuning parameter. A general rule is to set it to 70-80% of available RAM on a dedicated MySQL server:

```text
[mysqld]
# For a server with 8GB RAM
innodb_buffer_pool_size = 6G

# For a server with 4GB RAM
innodb_buffer_pool_size = 3G

# For local development (1GB RAM)
innodb_buffer_pool_size = 256M
```

## Setting Maximum Connections

Each connection uses memory. Set `max_connections` based on your workload and available RAM:

```text
[mysqld]
max_connections = 200
thread_cache_size = 10
```

Check the actual connection usage after tuning:

```sql
SHOW STATUS LIKE 'Max_used_connections';
SHOW STATUS LIKE 'Threads_connected';
```

## Configuring the Slow Query Log

Enable the slow query log to capture queries that exceed a threshold:

```text
[mysqld]
slow_query_log          = 1
slow_query_log_file     = /var/log/mysql/slow.log
long_query_time         = 1
log_queries_not_using_indexes = 1
```

This logs all queries taking more than 1 second plus any queries not using an index.

## Applying Configuration Changes

After editing `my.cnf`, validate the syntax and restart MySQL:

```bash
# Validate configuration (dry run)
mysqld --validate-config

# Restart the service
sudo systemctl restart mysql

# Verify MySQL started cleanly
sudo systemctl status mysql
sudo tail -50 /var/log/mysql/error.log
```

## Checking Applied Settings

After restart, confirm settings are active from within MySQL:

```sql
SHOW VARIABLES LIKE 'character_set_server';
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'slow_query_log';
```

Some variables can be changed at runtime without a restart:

```sql
SET GLOBAL max_connections = 200;
SET GLOBAL long_query_time = 2;
```

Runtime changes are lost on restart unless also written to `my.cnf`.

## Summary

After a fresh MySQL installation, edit `my.cnf` to configure the character set to `utf8mb4`, tune `innodb_buffer_pool_size` to a fraction of available RAM, set `max_connections` appropriately, and enable slow query logging. Always validate the configuration with `mysqld --validate-config` before restarting the server, and confirm settings with `SHOW VARIABLES` after the restart.
