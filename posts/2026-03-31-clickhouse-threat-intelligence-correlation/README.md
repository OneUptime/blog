# How to Build Threat Intelligence Correlation with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Threat Intelligence, Security, Correlation, IoC

Description: Correlate internal security events with external threat intelligence feeds in ClickHouse to detect known malicious actors and indicators of compromise.

---

Threat intelligence correlation matches your internal telemetry against external feeds of known bad IPs, domains, file hashes, and patterns. ClickHouse enables fast JOIN-based correlation across billions of events.

## Threat Intelligence Feed Table

```sql
CREATE TABLE threat_intel_iocs
(
    ioc_id UUID DEFAULT generateUUIDv4(),
    ioc_type LowCardinality(String),
    ioc_value String,
    threat_type LowCardinality(String),
    confidence UInt8,
    severity LowCardinality(String),
    source LowCardinality(String),
    first_seen DateTime,
    last_seen DateTime,
    tags Array(String),
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (ioc_type, ioc_value);
```

## Internal Events Table

```sql
CREATE TABLE internal_events
(
    event_id UUID DEFAULT generateUUIDv4(),
    event_type LowCardinality(String),
    source_ip IPv4,
    dest_ip IPv4,
    domain String DEFAULT '',
    file_hash String DEFAULT '',
    user_name String DEFAULT '',
    hostname String DEFAULT '',
    event_time DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(event_time)
ORDER BY (source_ip, event_time);
```

## Correlate IPs Against Threat Feed

```sql
SELECT
    e.event_type,
    e.source_ip,
    e.hostname,
    e.user_name,
    t.threat_type,
    t.severity,
    t.confidence,
    t.source AS intel_source,
    e.event_time
FROM internal_events e
JOIN threat_intel_iocs FINAL AS t
    ON CAST(e.source_ip AS String) = t.ioc_value
    AND t.ioc_type = 'ip'
WHERE e.event_time >= now() - INTERVAL 24 HOUR
ORDER BY t.severity DESC, e.event_time DESC
LIMIT 100;
```

## Correlate Domains Against Threat Feed

```sql
SELECT
    e.hostname,
    e.source_ip,
    e.user_name,
    t.threat_type,
    t.severity,
    t.confidence,
    count() AS hit_count
FROM internal_events e
JOIN threat_intel_iocs FINAL AS t
    ON e.domain = t.ioc_value
    AND t.ioc_type = 'domain'
WHERE e.event_time >= now() - INTERVAL 24 HOUR
  AND e.domain != ''
GROUP BY e.hostname, e.source_ip, e.user_name, t.threat_type, t.severity, t.confidence
ORDER BY hit_count DESC;
```

## High Confidence Hits Summary

```sql
SELECT
    t.threat_type,
    t.severity,
    count() AS total_hits,
    countDistinct(e.source_ip) AS unique_internal_ips,
    countDistinct(e.user_name) AS unique_users,
    min(e.event_time) AS first_hit,
    max(e.event_time) AS last_hit
FROM internal_events e
JOIN threat_intel_iocs FINAL AS t
    ON CAST(e.source_ip AS String) = t.ioc_value
    AND t.ioc_type = 'ip'
WHERE e.event_time >= now() - INTERVAL 7 DAY
  AND t.confidence >= 80
GROUP BY t.threat_type, t.severity
ORDER BY total_hits DESC;
```

## IOC Coverage Metrics

```sql
SELECT
    ioc_type,
    count() AS total_iocs,
    countIf(confidence >= 80) AS high_confidence,
    countIf(last_seen >= now() - INTERVAL 7 DAY) AS active_last_7days,
    min(first_seen) AS oldest_ioc,
    max(last_seen) AS newest_ioc
FROM threat_intel_iocs FINAL
GROUP BY ioc_type
ORDER BY total_iocs DESC;
```

## Threat Feed Freshness Check

```sql
SELECT
    source,
    ioc_type,
    count() AS ioc_count,
    max(last_seen) AS last_updated,
    dateDiff('hour', max(last_seen), now()) AS hours_since_update
FROM threat_intel_iocs FINAL
GROUP BY source, ioc_type
ORDER BY hours_since_update DESC;
```

## Summary

ClickHouse correlates internal events against threat intelligence feeds efficiently through indexed JOIN operations on `ReplacingMergeTree` IOC tables. Using `FINAL` on threat feeds ensures deduplicated results while maintaining fast query performance. This approach handles millions of IOCs and billions of internal events, making it practical for security teams to run threat intelligence correlation without a dedicated SIEM appliance.
