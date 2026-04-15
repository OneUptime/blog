# How to Build Telecom Fraud Detection with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Telecom, Fraud Detection, Security, Anomaly Detection

Description: Detect telecom fraud patterns including IRSF, SIM swaps, and wangiri attacks in ClickHouse using statistical thresholds and behavioral baselines.

---

Telecom fraud costs the industry billions of dollars annually. International Revenue Share Fraud (IRSF), wangiri, SIM box bypass, and subscription fraud are common attack vectors. ClickHouse enables near-real-time detection by running statistical queries over raw CDR and usage data.

## Fraud Signal Table

```sql
CREATE TABLE fraud_signals (
    signal_id       UUID,
    subscriber_id   UInt64,
    signal_type     LowCardinality(String),
    detected_at     DateTime,
    severity        LowCardinality(String),  -- 'low', 'medium', 'high'
    details         String,
    is_confirmed    UInt8,
    resolved_at     Nullable(DateTime)
) ENGINE = MergeTree()
ORDER BY (signal_type, detected_at)
PARTITION BY toYYYYMM(detected_at);
```

## IRSF Detection - Short Calls to Premium Ranges

IRSF attackers make many short calls to premium-rate international numbers.

```sql
SELECT
    a_number                              AS subscriber,
    left(b_number, 7)                     AS prefix,
    count()                               AS call_count,
    avg(duration_secs)                    AS avg_duration,
    sum(cost_cents) / 100                 AS total_cost
FROM cdr
WHERE call_type = 'voice'
  AND direction = 'outbound'
  AND call_start >= now() - INTERVAL 1 HOUR
  AND duration_secs < 30    -- short calls typical of IRSF
  AND b_number LIKE '+8%'   -- example premium range prefix
GROUP BY subscriber, prefix
HAVING call_count > 20
ORDER BY call_count DESC
LIMIT 20;
```

## Wangiri Detection - One-Ring Missed Calls

Wangiri generates one-second calls to lure victims into calling back premium numbers.

```sql
SELECT
    b_number                AS target,
    count()                 AS missed_call_count,
    count(DISTINCT a_number) AS unique_callers,
    min(call_start)         AS first_seen,
    max(call_start)         AS last_seen
FROM cdr
WHERE duration_secs <= 2
  AND termination = 'no_answer'
  AND call_start >= now() - INTERVAL 30 MINUTE
GROUP BY target
HAVING missed_call_count > 100
ORDER BY missed_call_count DESC
LIMIT 20;
```

## SIM Box Detection - Identical Timing Patterns

SIM box gateways route calls with suspiciously uniform call durations.

```sql
SELECT
    a_number,
    count()                    AS calls,
    stddevPop(duration_secs)   AS duration_stddev,
    avg(duration_secs)         AS avg_duration
FROM cdr
WHERE call_type = 'voice'
  AND call_start >= today() - 1
GROUP BY a_number
HAVING calls > 50
   AND duration_stddev < 2   -- unnaturally consistent durations
ORDER BY duration_stddev ASC
LIMIT 20;
```

## Account Takeover - Sudden Usage Spike

```sql
SELECT *
FROM (
    SELECT
        subscriber_id,
        toDate(activity_date) AS day,
        data_mb,
        avg(data_mb) OVER (
            PARTITION BY subscriber_id
            ORDER BY activity_date
            ROWS BETWEEN 14 PRECEDING AND 1 PRECEDING
        ) AS rolling_avg_mb
    FROM subscriber_activity
    WHERE activity_date >= today() - 3
)
WHERE data_mb > rolling_avg_mb * 10   -- 10x normal usage
ORDER BY data_mb DESC
LIMIT 50;
```

## Fraud Score Dashboard

```sql
SELECT
    subscriber_id,
    countIf(signal_type = 'irsf')       AS irsf_signals,
    countIf(signal_type = 'wangiri')    AS wangiri_signals,
    countIf(signal_type = 'sim_box')    AS simbox_signals,
    countIf(severity = 'high')          AS high_severity_count
FROM fraud_signals
WHERE detected_at >= today() - 7
  AND is_confirmed = 0
GROUP BY subscriber_id
ORDER BY (irsf_signals + wangiri_signals + simbox_signals) DESC
LIMIT 50;
```

## Summary

ClickHouse allows telecom fraud teams to run complex pattern detection queries over billions of CDR records in seconds. By combining short-call volume analysis, timing variance checks, and rolling usage baselines, you can build a multi-signal fraud scoring system that catches attackers in near real time - well before the financial damage compounds.
