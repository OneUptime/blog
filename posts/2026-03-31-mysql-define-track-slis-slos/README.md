# How to Define and Track MySQL SLIs and SLOs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SLO, Monitoring

Description: Define meaningful SLIs and SLOs for MySQL covering availability, query latency, and error rate, then implement tracking with Prometheus and alerting rules.

---

Service Level Indicators (SLIs) are the metrics you measure. Service Level Objectives (SLOs) are the targets you set for those metrics. For MySQL, defining the right SLIs and SLOs gives you a shared language for reliability conversations and clear thresholds for alerting.

## Core MySQL SLIs

| SLI | Definition | Good Proxy Metric |
|---|---|---|
| Availability | MySQL responds to connections | `mysql_up` from mysqld_exporter |
| Query latency | P99 query execution time | Performance Schema digest stats |
| Error rate | Percentage of failed connections | `Aborted_connects`, `Connection_errors_*` |
| Replication lag | Seconds behind primary | `Seconds_Behind_Master` |

## Defining SLOs

Start conservatively and tighten over time:

```text
SLO 1: MySQL availability >= 99.9% over any 30-day rolling window
SLO 2: P99 SELECT query latency < 100ms over any 1-hour window
SLO 3: Connection error rate < 0.1% of total connection attempts
SLO 4: Replication lag < 10 seconds for 99% of the time
```

## Tracking Availability

```sql
-- Test connection script (run from monitoring host every 30s)
SELECT 1;
```

In Prometheus:

```text
mysql_up == 1  -- 1 = available, 0 = down
```

30-day availability as a percentage:

```text
avg_over_time(mysql_up[30d]) * 100
```

## Tracking Query Latency from Performance Schema

```sql
SELECT
  DIGEST_TEXT,
  COUNT_STAR                             AS executions,
  ROUND(AVG_TIMER_WAIT / 1e9, 3)        AS avg_latency_ms,
  ROUND(QUANTILE_99 / 1e9, 3)           AS p99_latency_ms
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = 'app_db'
  AND COUNT_STAR > 100
ORDER BY p99_latency_ms DESC
LIMIT 10;
```

Note: `QUANTILE_99` requires MySQL 8.0.25+.

## Tracking Error Rate

```sql
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Aborted_connects') AS failed_connects,
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Connections')       AS total_connects;
```

Error rate = `Aborted_connects / Connections * 100`

## Prometheus Alert Rules for SLOs

```yaml
groups:
  - name: mysql_slos
    rules:
      - alert: MySQLAvailabilitySLOBreach
        expr: mysql_up == 0
        for: 1m
        annotations:
          summary: "MySQL is down - availability SLO at risk"

      - alert: MySQLHighAbortRate
        expr: >
          rate(mysql_global_status_aborted_connects[5m]) /
          rate(mysql_global_status_connections[5m]) > 0.001
        for: 10m
        annotations:
          summary: "MySQL connection error rate above 0.1%"

      - alert: MySQLReplicationLagSLO
        expr: mysql_slave_status_seconds_behind_master > 10
        for: 5m
        annotations:
          summary: "Replication lag exceeds 10s SLO threshold"
```

## Summary

Define MySQL SLOs around availability, query latency percentiles, connection error rate, and replication lag. Implement SLI measurement through Performance Schema counters and `mysqld_exporter` Prometheus metrics. Set alert thresholds that fire with enough lead time to take corrective action before a full SLO breach.
