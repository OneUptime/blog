# How to Set Up MySQL Performance Baselines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Monitoring

Description: Establish MySQL performance baselines by capturing key metrics at regular intervals, store them in a baseline table, and detect anomalies against historical norms.

---

A performance baseline is a record of what "normal" looks like for your MySQL instance. Without it, you have no way to tell whether a current metric value is an anomaly or just typical behavior. Baselines turn raw numbers into context.

## What to Baseline

At minimum, capture these metrics during normal operating hours:

- Queries per second (QPS)
- Active connections
- InnoDB buffer pool hit rate
- P95 query latency from Performance Schema
- Replication lag (if applicable)
- CPU and memory utilization at the OS level

## Creating a Baseline Capture Table

```sql
CREATE DATABASE IF NOT EXISTS mysql_monitoring;

CREATE TABLE mysql_monitoring.performance_baseline (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  captured_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  day_of_week     TINYINT,
  hour_of_day     TINYINT,
  qps             DECIMAL(10,2),
  connections     INT,
  buffer_hit_rate DECIMAL(5,2),
  threads_running INT,
  slow_queries    BIGINT,
  INDEX idx_dow_hour (day_of_week, hour_of_day)
);
```

## Baseline Capture Script

```bash
#!/bin/bash
# capture_baseline.sh - run every 5 minutes via cron

MYSQL="mysql -u monitor_user -p${MYSQL_MONITOR_PASSWORD} -se"
DB="mysql_monitoring"
PREV_FILE="/tmp/mysql_baseline_prev_questions"

# Capture current values
QUESTIONS=$(  $MYSQL "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Questions'")
CONNECTIONS=$(  $MYSQL "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Threads_connected'")
THREADS_RUN=$(  $MYSQL "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Threads_running'")
BP_READS=$(     $MYSQL "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Innodb_buffer_pool_reads'")
BP_REQUESTS=$(  $MYSQL "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Innodb_buffer_pool_read_requests'")
SLOW=$(         $MYSQL "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Slow_queries'")

# Calculate QPS from delta (Questions is a cumulative counter)
PREV_QUESTIONS=0
if [ -f "$PREV_FILE" ]; then
    PREV_QUESTIONS=$(cat "$PREV_FILE")
fi
echo "$QUESTIONS" > "$PREV_FILE"

if [ "$PREV_QUESTIONS" -gt 0 ]; then
    QPS=$(echo "scale=2; ($QUESTIONS - $PREV_QUESTIONS) / 300" | bc)
else
    QPS=0
fi

# Calculate hit rate
HIT_RATE=$(echo "scale=2; (1 - $BP_READS / $BP_REQUESTS) * 100" | bc)

# Insert into baseline table
$MYSQL "INSERT INTO ${DB}.performance_baseline
  (day_of_week, hour_of_day, qps, connections, buffer_hit_rate, threads_running, slow_queries)
  VALUES (DAYOFWEEK(NOW()), HOUR(NOW()), $QPS, $CONNECTIONS, $HIT_RATE, $THREADS_RUN, $SLOW)"

echo "Baseline captured at $(date)"
```

Schedule via cron:

```text
*/5 * * * * /opt/scripts/capture_baseline.sh >> /var/log/mysql_baseline.log 2>&1
```

## Querying the Baseline

```sql
-- Average QPS by hour for a given day of week (1=Sunday, 2=Monday...)
SELECT
  hour_of_day,
  ROUND(AVG(qps), 0)             AS avg_qps,
  ROUND(MAX(qps), 0)             AS peak_qps,
  ROUND(AVG(buffer_hit_rate), 2) AS avg_hit_rate
FROM mysql_monitoring.performance_baseline
WHERE day_of_week = DAYOFWEEK(NOW())
  AND captured_at >= DATE_SUB(NOW(), INTERVAL 4 WEEK)
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

## Detecting Anomalies

```sql
-- Find hours where current metrics deviate >20% from baseline average
SELECT
  b.hour_of_day,
  ROUND(AVG(b.qps), 0) AS baseline_qps,
  c.current_qps,
  ROUND((c.current_qps - AVG(b.qps)) / AVG(b.qps) * 100, 1) AS deviation_pct
FROM mysql_monitoring.performance_baseline b
JOIN (SELECT 1500 AS current_qps) c
WHERE b.day_of_week = DAYOFWEEK(NOW())
  AND b.hour_of_day = HOUR(NOW())
  AND b.captured_at >= DATE_SUB(NOW(), INTERVAL 4 WEEK)
GROUP BY b.hour_of_day, c.current_qps
HAVING ABS(deviation_pct) > 20;
```

## Summary

Performance baselines require a disciplined capture routine: collect key metrics every 5 minutes, store them with day-of-week and hour-of-day, and retain at least 4 weeks of history. With that foundation, you can detect anomalies by comparing current metrics against the historical average for the same time window, making alert thresholds adaptive rather than static.
