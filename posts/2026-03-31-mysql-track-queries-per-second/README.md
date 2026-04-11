# How to Track MySQL Queries per Second

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Monitoring, Performance

Description: Measure MySQL queries per second using global status variables, Performance Schema, and Prometheus mysqld_exporter to detect load changes.

---

Queries per second (QPS) is one of the most fundamental MySQL metrics. A sudden spike signals unexpected traffic or a runaway query. A sustained drop may indicate application errors. Tracking QPS over time gives you a baseline to reason about all other performance metrics.

## Reading QPS from Global Status

MySQL exposes a cumulative `Questions` counter. To get QPS, calculate the delta over an interval:

```sql
-- Snapshot 1
SELECT VARIABLE_VALUE AS questions_t1
FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Questions';

-- Wait 60 seconds, then snapshot 2
SELECT VARIABLE_VALUE AS questions_t2
FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Questions';

-- QPS = (questions_t2 - questions_t1) / 60
```

## Using mysqladmin for a Quick Reading

```bash
mysqladmin -u root -p extended-status | grep -i questions
```

For a live rate:

```bash
mysqladmin -u root -p -i 5 extended-status | grep -E "Questions|Uptime"
```

The `-i 5` flag refreshes every 5 seconds.

## Differentiating Question Types

`Questions` counts statements sent by clients to the server, including prepared statement executions, but excludes statements executed within stored programs. Use these counters to break down by type:

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Com_select',
  'Com_insert',
  'Com_update',
  'Com_delete',
  'Com_call_procedure'
);
```

The difference between snapshots divided by the interval gives read QPS, write QPS, and so on separately.

## Shell Script for Continuous QPS Sampling

```bash
#!/bin/bash
PREV=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Questions'")

while true; do
  sleep 10
  CURR=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
    "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Questions'")
  QPS=$(( (CURR - PREV) / 10 ))
  echo "$(date '+%H:%M:%S') QPS: $QPS"
  PREV=$CURR
done
```

## Prometheus Metrics via mysqld_exporter

The official Prometheus exporter exposes QPS as:

```text
mysql_global_status_questions
```

A PromQL rate query:

```text
rate(mysql_global_status_questions[1m])
```

Alert rule example:

```yaml
groups:
  - name: mysql
    rules:
      - alert: MySQLHighQPS
        expr: rate(mysql_global_status_questions[5m]) > 5000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MySQL QPS above 5000"
```

## What Constitutes a Normal QPS?

Baselines vary by workload. A small e-commerce application might run 100-500 QPS under normal load. A high-traffic SaaS product might run 5,000-50,000 QPS. Establish your own baseline by tracking QPS during off-peak, normal, and peak windows.

## Summary

Track MySQL QPS by sampling `Questions` from `performance_schema.global_status` at regular intervals. Break it down by `Com_select`, `Com_insert`, and related counters for granular visibility. Expose it via Prometheus `mysqld_exporter` for alerting and dashboard integration.
