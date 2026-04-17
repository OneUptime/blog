# How to Build Custom Alerting Rules Over ClickHouse Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Alerting, Monitoring, Rule Engine, Observability

Description: Build a custom alerting engine that runs SQL-based rules over ClickHouse data to detect anomalies and trigger notifications.

---

ClickHouse does not have built-in alerting, but its fast query execution makes it easy to build a SQL-based alerting engine on top. You define alert rules as queries and run them on a schedule to detect anomalies.

## Alert Rules Table

```sql
CREATE TABLE alert_rules
(
    rule_id UUID DEFAULT generateUUIDv4(),
    rule_name String,
    query String,
    threshold Float64,
    comparison LowCardinality(String),
    severity LowCardinality(String),
    notify_channel String,
    is_active UInt8 DEFAULT 1,
    check_interval_seconds UInt32 DEFAULT 60,
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (severity, rule_id);
```

## Alert Incidents Table

```sql
CREATE TABLE alert_incidents
(
    incident_id UUID DEFAULT generateUUIDv4(),
    rule_id UUID,
    rule_name String,
    triggered_value Float64,
    threshold Float64,
    severity LowCardinality(String),
    message String,
    triggered_at DateTime DEFAULT now(),
    resolved_at Nullable(DateTime) DEFAULT NULL
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(triggered_at)
ORDER BY (severity, triggered_at);
```

## Example: High Error Rate Alert Query

This query is stored in the `alert_rules` table and executed periodically.

```sql
SELECT
    service_name,
    round(countIf(status_code >= 500) * 100.0 / count(), 3) AS error_rate_pct
FROM api_requests
WHERE requested_at >= now() - INTERVAL 5 MINUTE
GROUP BY service_name
HAVING error_rate_pct > 5.0;
```

## Example: High Latency Alert

```sql
SELECT
    service_name,
    round(quantile(0.99)(response_time_ms), 2) AS p99_ms
FROM api_requests
WHERE requested_at >= now() - INTERVAL 5 MINUTE
GROUP BY service_name
HAVING p99_ms > 2000;
```

## Example: Low Throughput Alert

```sql
SELECT
    service_name,
    count() AS request_count
FROM api_requests
WHERE requested_at >= now() - INTERVAL 5 MINUTE
GROUP BY service_name
HAVING request_count < 100;
```

## Checking for Active Incidents

```sql
SELECT
    rule_name,
    triggered_value,
    threshold,
    severity,
    message,
    triggered_at,
    dateDiff('minute', triggered_at, now()) AS age_minutes
FROM alert_incidents
WHERE resolved_at IS NULL
ORDER BY severity DESC, triggered_at DESC;
```

## Alert Volume by Severity - Last 7 Days

```sql
SELECT
    toDate(triggered_at) AS day,
    severity,
    count() AS alerts,
    countDistinct(rule_name) AS distinct_rules
FROM alert_incidents
WHERE triggered_at >= now() - INTERVAL 7 DAY
GROUP BY day, severity
ORDER BY day DESC, severity;
```

## Mean Time to Resolve by Rule

```sql
SELECT
    rule_name,
    count() AS total_incidents,
    round(avg(dateDiff('minute', triggered_at, resolved_at)), 1) AS avg_ttm_minutes,
    round(quantile(0.95)(dateDiff('minute', triggered_at, resolved_at)), 1) AS p95_ttm_minutes
FROM alert_incidents
WHERE resolved_at IS NOT NULL
  AND triggered_at >= now() - INTERVAL 30 DAY
GROUP BY rule_name
ORDER BY avg_ttm_minutes DESC;
```

## Scheduling Alert Checks

Run alert checks from a small service using the ClickHouse HTTP API.

```bash
curl -s "http://clickhouse:8123/?default_format=JSON&query=$(python3 -c "import urllib.parse; print(urllib.parse.quote(open('alert_check.sql').read()))")" \
  | jq '.data[] | select(.error_rate_pct > 5)'
```

## Summary

A SQL-based alerting engine over ClickHouse is simple to build and extremely flexible. By storing rule definitions and incidents in ClickHouse tables, you get historical alert data for free, enabling MTTR tracking, alert fatigue analysis, and rule tuning. This approach pairs well with notification systems like PagerDuty, Slack, or OneUptime.
