# How to Use pt-query-digest to Analyze MySQL Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, pt-query-digest, Percona Toolkit, Performance Analysis, Query Optimization

Description: Learn how to install and use pt-query-digest from Percona Toolkit to analyze MySQL slow query logs and find your most expensive queries.

---

## What Is pt-query-digest

`pt-query-digest` is a command-line tool included in Percona Toolkit. It reads MySQL slow query logs, general logs, or binary logs and produces a detailed report grouping similar queries together. Unlike `mysqldumpslow`, it provides richer statistics including percentile breakdowns, concurrency estimates, and query fingerprints. It is one of the most widely used tools for MySQL performance analysis.

## Installing Percona Toolkit

On Ubuntu or Debian:

```bash
sudo apt-get install percona-toolkit
```

On CentOS or RHEL:

```bash
sudo yum install percona-toolkit
```

Or install manually from the Percona website:

```bash
wget https://www.percona.com/downloads/percona-toolkit/latest/binary/tarball/percona-toolkit-3.x.tar.gz
tar -xzf percona-toolkit-3.x.tar.gz
cd percona-toolkit-3.x
sudo perl Makefile.PL && sudo make install
```

Verify the installation:

```bash
pt-query-digest --version
```

## Basic Usage

Point `pt-query-digest` at your slow query log file:

```bash
pt-query-digest /var/log/mysql/slow.log
```

The output has three sections:
1. An overall summary of the log
2. A ranked list of query classes by total response time
3. Detailed statistics for each query class

## Reading the Report

The summary section shows totals across all queries:

```text
# Overall: 12.34k QPS, 1.23x concurrency __________
# Time range: 2026-03-31 00:00:00 to 2026-03-31 23:59:59
# Attribute          total     min     max     avg     95%  stddev  median
# ============     ======= ======= ======= ======= ======= ======= =======
# Exec time          3421s    50ms    12s   278ms   980ms   410ms   180ms
# Rows examine      850.2M       1  5.00M  68.93k   1.00M  220.23k   2000
# Rows sent           1.23M       1   5000     100     800     200      20
```

Each query class in the ranked list shows:

```text
Rank  Response time  Calls  R/Call  V/M  Item
====  =============  =====  ======  ===  ====
   1  1230.1 35.9%   4523   0.272  0.15  SELECT orders
   2   845.3 24.7%   1201   0.703  0.42  SELECT products
```

The most important column is `Response time`, which shows total time consumed. Start optimizing from the top.

## Filtering Output

Show only the top 5 queries:

```bash
pt-query-digest --limit 5 /var/log/mysql/slow.log
```

Filter to a specific database:

```bash
pt-query-digest --filter '$event->{db} eq "myapp"' /var/log/mysql/slow.log
```

Filter to queries slower than 2 seconds:

```bash
pt-query-digest --filter '$event->{Query_time} >= 2' /var/log/mysql/slow.log
```

## Analyzing from a Running MySQL Instance

`pt-query-digest` can also capture queries directly from a running MySQL server using `tcpdump`:

```bash
sudo tcpdump -s 65535 -x -nn -q -tttt -i eth0 -c 5000 port 3306 > /tmp/mysql.tcp
pt-query-digest --type tcpdump /tmp/mysql.tcp
```

This is useful when you cannot enable the slow query log or need real-time analysis.

## Saving Reports to a File

Redirect output to a file for later review:

```bash
pt-query-digest /var/log/mysql/slow.log > /tmp/slow_query_report.txt
```

For automated monitoring pipelines, save results to a MySQL table:

```bash
pt-query-digest \
  --review h=localhost,u=root,p=secret,D=percona,t=query_review \
  --history h=localhost,u=root,p=secret,D=percona,t=query_review_history \
  /var/log/mysql/slow.log
```

## Summary

`pt-query-digest` from Percona Toolkit is the gold standard for analyzing MySQL slow query logs. It groups similar queries by fingerprint, ranks them by total response time, and provides statistical breakdowns including percentiles and concurrency estimates. Starting with the top-ranked queries by total response time gives you the highest return on optimization investment.
