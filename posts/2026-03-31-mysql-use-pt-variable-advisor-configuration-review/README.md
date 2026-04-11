# How to Use pt-variable-advisor for MySQL Configuration Review

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Percona, Optimization, Variable

Description: Learn how to use pt-variable-advisor to analyze MySQL server variables and receive actionable recommendations for improving your configuration.

---

## What is pt-variable-advisor?

`pt-variable-advisor` is a Percona Toolkit utility that inspects the current MySQL server variable settings and produces a report of potential problems, best practice violations, and optimization opportunities. It connects to a running MySQL instance, reads `SHOW VARIABLES`, then applies a set of rules to identify configuration issues.

## Basic Usage

Connect to a MySQL instance and run the analysis:

```bash
pt-variable-advisor \
  --host=127.0.0.1 \
  --user=root \
  --password=secret
```

## Sample Output

```text
# WARN delay_key_write: MyISAM delay_key_write is enabled for some tables.
# WARN max_connect_errors: max_connect_errors is very high.
# WARN query_cache_type: The query cache is enabled.
# NOTE thread_cache_size: thread_cache_size is 0; this may cause excessive thread creation.
# WARN log_bin: Binary logging is disabled; you will be unable to replicate or use point-in-time recovery.
```

Each item is prefixed with a severity: `NOTE`, `WARN`, or `CRIT`.

## Saving the Report

```bash
pt-variable-advisor \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  > variable_advisor_report.txt
```

## Analyzing a Remote Server

```bash
pt-variable-advisor \
  --host=db.prod.internal \
  --port=3306 \
  --user=dba_user \
  --password=secret
```

## Common Recommendations and How to Act on Them

After reviewing the output, apply fixes in `/etc/mysql/my.cnf`:

```text
[mysqld]
# Enable binary logging for replication and PITR
log_bin = /var/log/mysql/mysql-bin.log
binlog_expire_logs_seconds = 604800

# Disable the deprecated query cache (MySQL 5.7 only;
# these variables were removed in MySQL 8.0.3+ and will
# prevent the server from starting if included)
query_cache_type = 0
query_cache_size = 0

# Tune thread cache to reduce thread creation overhead
thread_cache_size = 16

# Reduce max_connect_errors to a sensible value
max_connect_errors = 100
```

Reload the server after making changes:

```bash
systemctl restart mysql
```

## Verifying Changes

After restarting, confirm the new values are active:

```sql
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'query_cache_type';
SHOW VARIABLES LIKE 'thread_cache_size';
```

Re-run `pt-variable-advisor` to confirm the warnings are resolved:

```bash
pt-variable-advisor \
  --host=127.0.0.1 \
  --user=root \
  --password=secret
```

## Combining with pt-mysql-summary

For a fuller picture of server health, run `pt-mysql-summary` alongside `pt-variable-advisor`:

```bash
pt-mysql-summary -- --host=127.0.0.1 --user=root --password=secret
pt-variable-advisor --host=127.0.0.1 --user=root --password=secret
```

Together these two tools provide both a narrative overview and specific variable-level recommendations.

## Summary

`pt-variable-advisor` is a fast, read-only analysis tool that should be part of every MySQL deployment review. Run it against new servers before go-live, after major version upgrades, and periodically on production instances to catch configuration drift. Treat `WARN` findings as action items and `NOTE` findings as informational improvements to consider for your environment.
