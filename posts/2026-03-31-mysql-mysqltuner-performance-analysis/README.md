# How to Use MySQLTuner for Performance Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQLTuner, Performance, Tuning, Configuration

Description: Run MySQLTuner to analyze MySQL configuration and usage statistics, then apply its recommendations to improve query performance and resource utilization.

---

## What Is MySQLTuner

MySQLTuner is a Perl script that connects to a running MySQL instance, reads status variables and configuration, and outputs a list of recommendations to improve performance. It checks buffer pool sizing, slow query configuration, index efficiency, replication health, and security settings. It is not a replacement for profiling individual queries, but it provides a quick overall health check.

## Installing MySQLTuner

```bash
wget https://raw.githubusercontent.com/major/MySQLTuner-perl/master/mysqltuner.pl
chmod +x mysqltuner.pl
```

Or install via package manager:

```bash
sudo apt-get install -y mysqltuner
```

## Running MySQLTuner

Run with the MySQL root user for full access:

```bash
./mysqltuner.pl --user root --pass root_secret
```

For a remote server:

```bash
./mysqltuner.pl --host 192.168.1.10 --user root --pass root_secret --port 3306
```

## Understanding the Output

MySQLTuner output is divided into multiple sections. Here is a sample:

```text
-------- General Statistics --------------------------------------------------
[--] Skipped version check
[OK] Currently running supported MySQL version 8.0.35
[OK] Operating on 64-bit architecture

-------- Storage Engine Statistics -------------------------------------------
[OK] Total fragmented tables: 0

-------- Performance Metrics -------------------------------------------------
[!!] InnoDB buffer pool / data size: 128.0M / 4.5G
[!!] Slow queries: 5% (84/1673)
[OK] Temporary tables created on disk: 1% (22 on disk / 1673 total)
```

Lines marked `[OK]` are passing. Lines marked `[!!]` need attention.

## Acting on Common Recommendations

**InnoDB buffer pool too small:**

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
innodb_buffer_pool_size = 4G   # set to 60-80% of available RAM
```

**Too many connections:**

```ini
max_connections = 200
```

**Slow query log not enabled:**

```ini
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
```

**Thread cache not sized:**

```ini
thread_cache_size = 16
```

Reload MySQL after changing `mysqld.cnf`:

```bash
sudo systemctl restart mysql
```

## Running with Extended Recommendations

Use `--buffers` to see detailed buffer analysis, and `--json` for machine-readable output:

```bash
./mysqltuner.pl --user root --pass root_secret --buffers --json > tuner-report.json
```

## When to Run MySQLTuner

Run MySQLTuner after MySQL has been running under representative load for at least 24 hours - ideally 48-72 hours. Variables like `Key_reads` and `Innodb_buffer_pool_reads` only become meaningful after the caches have had time to warm up. Running it on a freshly started instance will produce misleading recommendations.

## Summary

MySQLTuner provides a fast, actionable checklist of MySQL configuration improvements by comparing runtime statistics against best-practice thresholds. Its most impactful recommendations typically involve InnoDB buffer pool sizing, slow query logging, and connection limits. Apply changes incrementally, restart MySQL, let the instance run under load for 24-48 hours, and re-run MySQLTuner to verify the improvements took effect.
