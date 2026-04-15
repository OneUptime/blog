# How to Build a SIEM System with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SIEM, Security, Log Analysis, Threat Detection

Description: Build a Security Information and Event Management system with ClickHouse to collect, correlate, and analyze security events at scale.

---

A SIEM collects security events from across your infrastructure, normalizes them, and runs correlation rules to detect threats. ClickHouse's high ingest throughput and fast aggregation queries make it a practical SIEM backend for teams who want to avoid expensive commercial tools.

## Security Events Table

```sql
CREATE TABLE security_events
(
    event_id UUID DEFAULT generateUUIDv4(),
    source_system LowCardinality(String),
    event_type LowCardinality(String),
    severity LowCardinality(String),
    source_ip IPv4,
    dest_ip IPv4,
    source_port UInt16 DEFAULT 0,
    dest_port UInt16 DEFAULT 0,
    user_name String DEFAULT '',
    action LowCardinality(String),
    outcome LowCardinality(String),
    raw_message String,
    tags Array(String),
    event_time DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(event_time)
ORDER BY (event_type, source_ip, event_time)
TTL toDate(event_time) + INTERVAL 365 DAY;
```

## Event Volume by Source and Type

```sql
SELECT
    source_system,
    event_type,
    severity,
    count() AS event_count
FROM security_events
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY source_system, event_type, severity
ORDER BY event_count DESC
LIMIT 30;
```

## Top Source IPs by Event Volume

```sql
SELECT
    source_ip,
    countDistinct(event_type) AS distinct_event_types,
    count() AS total_events,
    countIf(outcome = 'failure') AS failures,
    countIf(severity = 'critical') AS critical_events
FROM security_events
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY source_ip
ORDER BY total_events DESC
LIMIT 20;
```

## Lateral Movement Detection

Identify IPs accessing an unusually high number of distinct internal hosts.

```sql
SELECT
    source_ip,
    countDistinct(dest_ip) AS distinct_targets,
    count() AS connections
FROM security_events
WHERE event_time >= now() - INTERVAL 1 HOUR
  AND event_type IN ('network_connection', 'firewall_allow')
  AND dest_ip LIKE '10.%'
GROUP BY source_ip
HAVING distinct_targets > 10
ORDER BY distinct_targets DESC;
```

## Failed Authentication Spike Detection

```sql
SELECT
    toStartOfFiveMinutes(event_time) AS bucket,
    source_ip,
    user_name,
    count() AS failures
FROM security_events
WHERE event_type = 'authentication'
  AND outcome = 'failure'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY bucket, source_ip, user_name
HAVING failures > 20
ORDER BY bucket DESC, failures DESC;
```

## Critical Events in the Last 24 Hours

```sql
SELECT
    event_time,
    source_system,
    event_type,
    source_ip,
    user_name,
    action,
    outcome,
    raw_message
FROM security_events
WHERE severity = 'critical'
  AND event_time >= now() - INTERVAL 24 HOUR
ORDER BY event_time DESC
LIMIT 100;
```

## SIEM Alert Summary - Last 7 Days

```sql
SELECT
    toDate(event_time) AS day,
    severity,
    count() AS events,
    countDistinct(source_ip) AS unique_ips,
    countDistinct(user_name) AS unique_users
FROM security_events
WHERE event_time >= now() - INTERVAL 7 DAY
  AND severity IN ('high', 'critical')
GROUP BY day, severity
ORDER BY day DESC, severity;
```

## Materialized View for Real-Time Dashboards

```sql
CREATE MATERIALIZED VIEW siem_hourly_summary
ENGINE = AggregatingMergeTree()
ORDER BY (source_system, event_type, severity, hour)
AS
SELECT
    source_system,
    event_type,
    severity,
    toStartOfHour(event_time) AS hour,
    countState() AS events,
    uniqState(source_ip) AS unique_ips
FROM security_events
GROUP BY source_system, event_type, severity, hour;
```

To query the aggregated view, use the corresponding `-Merge` combinators:

```sql
SELECT
    source_system,
    event_type,
    severity,
    hour,
    countMerge(events) AS events,
    uniqMerge(unique_ips) AS unique_ips
FROM siem_hourly_summary
GROUP BY source_system, event_type, severity, hour
ORDER BY hour DESC;
```

## Summary

ClickHouse handles the scale demands of a SIEM with fast ingest, columnar compression for log storage, and sub-second aggregation over billions of events. Combining raw event tables with materialized views gives you both detailed investigation capability and real-time dashboard performance. This approach works well as the backend for custom SIEM dashboards built with Grafana or similar tools.
