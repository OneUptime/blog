# How to Use pt-query-digest for MySQL Query Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, pt-query-digest, Slow Query Log, Query Optimization

Description: Learn how to use pt-query-digest from Percona Toolkit to analyze MySQL slow query logs and identify the most expensive queries in your database.

---

## What Is pt-query-digest

`pt-query-digest` is a tool from Percona Toolkit that analyzes MySQL query logs and produces detailed reports on query performance. It groups similar queries together, calculates statistics like total execution time and average latency, and ranks queries by their impact on the database.

It is the most widely used tool for MySQL query performance analysis.

## Installation

Install Percona Toolkit using your package manager:

```bash
# Ubuntu / Debian
sudo apt-get install percona-toolkit

# Red Hat / CentOS
sudo yum install percona-toolkit

# macOS with Homebrew
brew install percona-toolkit
```

Verify the installation:

```bash
pt-query-digest --version
```

## Enable the Slow Query Log

Before using `pt-query-digest`, enable MySQL's slow query log:

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;  -- log queries slower than 1 second
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

To make it persistent, add to `my.cnf`:

```text
[mysqld]
slow_query_log = ON
long_query_time = 1
slow_query_log_file = /var/log/mysql/slow.log
log_queries_not_using_indexes = ON
```

## Basic Analysis

Analyze the slow query log:

```bash
pt-query-digest /var/log/mysql/slow.log
```

## Sample Output

The report shows a summary section followed by per-query details:

```text
# 100ms user time, 10ms system time, 31.35M rss, 42.11M vsz
# Current date: 2025-10-01T14:30:00
# Hostname: db-server-01
# Files: /var/log/mysql/slow.log
# Overall: 1.23k total, 45 unique, 0.01 QPS, 0.05x concurrency

# Profile
# Rank Query ID           Response time Calls R/Call V/M   Item
# ==== ================== ============= ===== ====== ===== ====
#    1 0x1234ABCD...       120.5000 30%   456  0.264  0.12  SELECT orders
#    2 0xABCD5678...        80.2000 20%   234  0.343  0.08  SELECT customers
#    3 0x5678EFAB...        60.1000 15%    89  0.675  0.25  UPDATE inventory
```

The top queries by total execution time are listed first.

## Per-Query Detail

Each query section shows:

```text
# Query 1: 0.01 QPS, 0.00x concurrency, ID 0x1234ABCD at byte 123456
# This item is included in the report because it matches --limit.
# Scores: V/M = 0.12
# Time range: 2025-10-01T08:00:00 to 2025-10-01T14:00:00
# Attribute    pct   total     min     max     avg     95%  stddev  median
# ============ === ======= ======= ======= ======= ======= ======= =======
# Count         37     456
# Exec time     30  121s    100ms   500ms   264ms   420ms    80ms   240ms
# Lock time      5   600ms     1ms     5ms   1.3ms   2.1ms  0.5ms   1.2ms
# Rows sent      8  45.6k      10     200   100.0   180.0    45.2    95.0
# Rows examine  40  200k      400     500   438.6   490.0    23.4   420.0
# Query_time distribution
#   1us
#  10us
# 100us  ####
#   1ms  ##########
#  10ms  #####
# 100ms  ##############################
#    1s
# EXPLAIN /*!50100 PARTITIONS*/
SELECT * FROM orders WHERE customer_id = 123 AND status = 'pending';
```

## Show the Top N Queries

Limit the report to the top 10 queries:

```bash
pt-query-digest --limit=10 /var/log/mysql/slow.log
```

## Report on Queries That Caused a Full Table Scan

Focus only on queries that triggered a full table scan (requires Percona Server's extended slow log):

```bash
pt-query-digest \
  --filter '($event->{Full_scan} eq "Yes")' \
  /var/log/mysql/slow.log
```

## Filter by Minimum Execution Time

Only report queries that took longer than 2 seconds:

```bash
pt-query-digest --filter='$event->{Query_time} > 2' /var/log/mysql/slow.log
```

## Analyze the General Query Log

`pt-query-digest` also works with the general query log, not just the slow query log:

```bash
pt-query-digest --type=genlog /var/lib/mysql/mysql-general.log
```

## Analyze tcpdump Captures

Capture live traffic and analyze it:

```bash
tcpdump -s 65535 -x -nn -q -tttt -i eth0 -c 5000 port 3306 > /tmp/mysql_traffic.txt
pt-query-digest --type=tcpdump /tmp/mysql_traffic.txt
```

## Output to a File

```bash
pt-query-digest /var/log/mysql/slow.log > /tmp/query_report.txt
```

## Analyze Binary Logs

Convert binary logs and analyze them:

```bash
mysqlbinlog /var/lib/mysql/binlog.000001 > /tmp/binlog.sql
pt-query-digest --type=binlog /tmp/binlog.sql
```

## Save Results to a MySQL Table

Store results in a database for historical tracking:

```bash
pt-query-digest \
  --review h=localhost,D=percona,t=query_review \
  --history h=localhost,D=percona,t=query_review_history \
  --no-report \
  --limit=0% \
  /var/log/mysql/slow.log
```

## Key Metrics to Focus On

| Metric | Meaning |
|--------|---------|
| `Response time` | Total time spent on this query class |
| `Calls` | How many times the query ran |
| `R/Call` | Average response time per call |
| `Rows examine` | Rows scanned - high values indicate missing indexes |
| `V/M` | Variance-to-mean ratio - high values mean inconsistent performance |

## Workflow for Query Optimization

```bash
# Step 1 - generate the report
pt-query-digest /var/log/mysql/slow.log --limit=5 > report.txt

# Step 2 - run EXPLAIN on the top query
mysql -u root -p -e "EXPLAIN SELECT * FROM orders WHERE customer_id = 123 AND status = 'pending'\G"

# Step 3 - add a missing index
mysql -u root -p myapp -e "ALTER TABLE orders ADD INDEX idx_customer_status (customer_id, status);"

# Step 4 - rotate the slow log and verify improvement
mysql -u root -p -e "FLUSH SLOW LOGS;"
```

## Summary

`pt-query-digest` is the most effective tool for identifying MySQL performance bottlenecks through slow query log analysis. By grouping similar queries and reporting total execution time, call count, and rows examined, it pinpoints exactly which queries are most expensive. Use it regularly with `EXPLAIN` output to guide index creation and query rewrites.
