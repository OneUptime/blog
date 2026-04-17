# How to Analyze Authentication Logs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Authentication, Log Analysis, Security, Audit

Description: Analyze authentication logs in ClickHouse to detect login anomalies, track failed attempts, and audit user access patterns.

---

Authentication logs are some of the most security-critical data your systems generate. ClickHouse lets you store and query auth events at scale to detect brute force attempts, account takeovers, and suspicious access patterns.

## Authentication Events Table

```sql
CREATE TABLE auth_events
(
    event_id UUID DEFAULT generateUUIDv4(),
    user_name String,
    user_id UInt64 DEFAULT 0,
    source_ip IPv4,
    user_agent String DEFAULT '',
    auth_method LowCardinality(String),
    outcome LowCardinality(String),
    failure_reason LowCardinality(String) DEFAULT '',
    service LowCardinality(String),
    event_time DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(event_time)
ORDER BY (user_name, event_time)
TTL toDate(event_time) + INTERVAL 365 DAY;
```

## Failed Login Summary

```sql
SELECT
    user_name,
    source_ip,
    failure_reason,
    count() AS failures,
    min(event_time) AS first_failure,
    max(event_time) AS last_failure
FROM auth_events
WHERE outcome = 'failure'
  AND event_time >= now() - INTERVAL 24 HOUR
GROUP BY user_name, source_ip, failure_reason
ORDER BY failures DESC
LIMIT 30;
```

## Success Rate per User

```sql
SELECT
    user_name,
    count() AS total_attempts,
    countIf(outcome = 'success') AS successes,
    countIf(outcome = 'failure') AS failures,
    round(countIf(outcome = 'failure') * 100.0 / count(), 2) AS failure_rate_pct
FROM auth_events
WHERE event_time >= now() - INTERVAL 7 DAY
GROUP BY user_name
HAVING total_attempts > 5
ORDER BY failure_rate_pct DESC
LIMIT 20;
```

## New Source IPs for Existing Users

Detect logins from IPs never seen before for a given user.

```sql
WITH historical_ips AS (
    SELECT user_name, source_ip
    FROM auth_events
    WHERE event_time < now() - INTERVAL 1 DAY
      AND outcome = 'success'
    GROUP BY user_name, source_ip
),
recent_logins AS (
    SELECT user_name, source_ip, event_time
    FROM auth_events
    WHERE event_time >= now() - INTERVAL 1 DAY
      AND outcome = 'success'
)
SELECT
    r.user_name,
    r.source_ip,
    r.event_time
FROM recent_logins r
WHERE (r.user_name, r.source_ip) NOT IN (
    SELECT user_name, source_ip FROM historical_ips
)
ORDER BY r.event_time DESC;
```

## Off-Hours Login Detection

Identify logins outside business hours (9am-6pm local time).

```sql
SELECT
    user_name,
    source_ip,
    event_time,
    toHour(toTimeZone(event_time, 'America/New_York')) AS local_hour
FROM auth_events
WHERE outcome = 'success'
  AND event_time >= now() - INTERVAL 24 HOUR
  AND (toHour(toTimeZone(event_time, 'America/New_York')) < 9
       OR toHour(toTimeZone(event_time, 'America/New_York')) >= 18)
ORDER BY event_time DESC;
```

## Account Lockout Candidates

Users with 5 or more failures in 15 minutes.

```sql
SELECT
    user_name,
    source_ip,
    count() AS failures,
    min(event_time) AS window_start,
    max(event_time) AS window_end
FROM auth_events
WHERE outcome = 'failure'
  AND event_time >= now() - INTERVAL 15 MINUTE
GROUP BY user_name, source_ip
HAVING failures >= 5
ORDER BY failures DESC;
```

## Geographic Anomaly - Multiple Countries Same User

```sql
SELECT
    user_name,
    groupArray(source_ip) AS ips,
    count() AS logins
FROM auth_events
WHERE outcome = 'success'
  AND event_time >= now() - INTERVAL 6 HOUR
GROUP BY user_name
HAVING length(ips) >= 3
ORDER BY logins DESC;
```

## Summary

ClickHouse provides fast, scalable authentication log analysis through columnar storage and efficient aggregation. Queries for failure rates, new IP detection, off-hours logins, and account lockout candidates run in seconds even on hundreds of millions of auth events. This makes ClickHouse a practical platform for continuous security monitoring of authentication infrastructure.
