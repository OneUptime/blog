# How to Build Real-Time Alerting with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Alerting, Real-Time, Monitoring, Analytics

Description: Build a real-time alerting system with ClickHouse that detects anomalies, threshold breaches, and pattern deviations in streaming data and notifies your team within seconds.

---

ClickHouse is not just a query engine - it can be the backbone of a real-time alerting system. By combining materialized views for continuous aggregation, scheduled queries for threshold detection, and webhook integrations for notification delivery, you can build an alerting pipeline that detects and notifies on events within seconds of occurrence.

## Alert Architecture

```text
Incoming Events (Kafka/HTTP)
    |
    v
ClickHouse Materialized View (per-second aggregation)
    |
    v
Alert Evaluation Loop (every 10 seconds)
    |-- Check thresholds against aggregated metrics
    |-- Detect anomalies (e.g., spike detection)
    |-- Insert triggered alerts to alert_events table
    |
    v
Notification Service (PagerDuty / Slack / Email)
```

## Alert Definitions Table

```sql
CREATE TABLE alert_definitions (
    alert_id UUID DEFAULT generateUUIDv4(),
    name String,
    metric_name String,
    condition LowCardinality(String),  -- 'gt', 'lt', 'eq'
    threshold Float64,
    window_seconds UInt32,
    severity LowCardinality(String),
    notification_channel String,
    enabled Bool DEFAULT true,
    created_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(created_at)
ORDER BY alert_id;
```

## Alert Events Table

```sql
CREATE TABLE alert_events (
    fired_at DateTime DEFAULT now(),
    alert_id UUID,
    alert_name String,
    metric_value Float64,
    threshold Float64,
    severity LowCardinality(String),
    notified Bool DEFAULT false
) ENGINE = MergeTree
ORDER BY fired_at
TTL fired_at + INTERVAL 90 DAY;
```

## Real-Time Metric Aggregation

```sql
CREATE TABLE metric_snapshots (
    ts DateTime,
    metric_name LowCardinality(String),
    value Float64,
    sample_count UInt32
) ENGINE = MergeTree
ORDER BY (metric_name, ts)
TTL ts + INTERVAL 24 HOUR;

CREATE MATERIALIZED VIEW error_rate_snapshot_mv
TO metric_snapshots
AS
SELECT
    toStartOfMinute(event_time) AS ts,
    'error_rate' AS metric_name,
    countIf(status_code >= 500) / count() * 100 AS value,
    count() AS sample_count
FROM http_events
GROUP BY ts;
```

## Alert Evaluation Query

Run this every 10-30 seconds to evaluate all enabled alerts:

```sql
INSERT INTO alert_events (alert_name, metric_value, threshold, severity)
SELECT
    d.name AS alert_name,
    m.value AS metric_value,
    d.threshold,
    d.severity
FROM (
    SELECT
        metric_name,
        avg(value) AS value
    FROM metric_snapshots
    WHERE ts >= now() - INTERVAL 5 MINUTE
    GROUP BY metric_name
) m
JOIN (
    SELECT * FROM alert_definitions FINAL WHERE enabled = true
) d ON m.metric_name = d.metric_name
WHERE
    ((d.condition = 'gt' AND m.value > d.threshold)
    OR (d.condition = 'lt' AND m.value < d.threshold))
    AND NOT EXISTS (
        -- No alert fired in the last 10 minutes (deduplication)
        SELECT 1 FROM alert_events
        WHERE alert_name = d.name
            AND fired_at >= now() - INTERVAL 10 MINUTE
    );
```

## Spike Detection (Anomaly Alert)

Detect sudden spikes compared to the baseline:

```sql
WITH
    current_rate AS (
        SELECT count() AS cnt
        FROM events
        WHERE event_time >= now() - INTERVAL 1 MINUTE
    ),
    baseline AS (
        SELECT avg(per_minute) AS avg_cnt
        FROM (
            SELECT
                toStartOfMinute(event_time) AS minute,
                count() AS per_minute
            FROM events
            WHERE event_time BETWEEN now() - INTERVAL 1 HOUR AND now() - INTERVAL 5 MINUTE
            GROUP BY minute
        )
    )
SELECT
    c.cnt AS current,
    b.avg_cnt AS baseline,
    c.cnt / b.avg_cnt AS ratio,
    c.cnt > b.avg_cnt * 3 AS is_spike
FROM current_rate c, baseline b;
```

If `is_spike = 1`, fire an alert.

## Notification Dispatcher

```python
import clickhouse_connect
import requests

ch = clickhouse_connect.get_client(host='clickhouse.internal', port=8443, secure=True)

def dispatch_alerts():
    alerts = ch.query('''
        SELECT alert_name, metric_value, threshold, severity, fired_at
        FROM alert_events
        WHERE notified = false
        ORDER BY fired_at ASC
        LIMIT 100
    ''').named_results()

    for alert in alerts:
        send_slack_notification(alert)
        ch.command(f'''
            ALTER TABLE alert_events
            UPDATE notified = true
            WHERE alert_name = '{alert["alert_name"]}'
              AND fired_at = '{alert["fired_at"]}'
        ''')

def send_slack_notification(alert: dict):
    requests.post(
        'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
        json={
            'text': f"*{alert['severity'].upper()}*: {alert['alert_name']} "
                    f"({alert['metric_value']:.2f} vs threshold {alert['threshold']})"
        }
    )
```

## Summary

Real-time alerting with ClickHouse combines materialized views for continuous metric aggregation, periodic alert evaluation queries that check thresholds and anomaly conditions, and a notification dispatcher that routes alerts to Slack or PagerDuty. Use deduplication in your evaluation query to prevent alert storms, implement spike detection using historical baselines, and store all alert history in ClickHouse for post-incident analysis.
