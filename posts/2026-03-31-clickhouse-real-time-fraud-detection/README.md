# How to Build a Real-Time Fraud Detection System with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Fraud Detection, Real-Time, Analytics, Security

Description: Build a real-time fraud detection pipeline in ClickHouse using velocity checks, behavioral baselines, and rule-based scoring on payment and transaction events.

## Introduction

Fraud detection requires answering questions like: "Has this card been used in two different countries in the last 10 minutes?" or "Has this account made more than 20 transactions in the last hour?" These are fundamentally aggregation and lookup queries over recent time windows, which is exactly where ClickHouse excels.

While ClickHouse is not a transactional database and should not be the system of record for financial transactions, it is excellent as the analytical layer that evaluates fraud signals. A common architecture inserts transactions into ClickHouse in real time via Kafka, then queries ClickHouse to compute fraud scores that feed a decision engine.

## Architecture Overview

```text
[Payment API] --> [Kafka] --> [ClickHouse Kafka Engine Table]
                                      |
                                      v
                             [Materialized Views]
                                      |
                                      v
                          [Fraud Score Queries] <-- [Decision Engine]
```

## Schema Design

### Transaction Events

```sql
CREATE TABLE transaction_events
(
    transaction_id  String,
    occurred_at     DateTime64(3),
    account_id      String,
    card_id         String,
    merchant_id     LowCardinality(String),
    merchant_country LowCardinality(String),
    merchant_category LowCardinality(String),
    amount_usd      Decimal(18, 4),
    currency        LowCardinality(String),
    ip_address      IPv4,
    device_id       String,
    is_online       UInt8,
    channel         LowCardinality(String),  -- web, mobile, pos, api
    status          LowCardinality(String),  -- approved, declined, pending
    fraud_label     UInt8 DEFAULT 0          -- set retroactively by fraud team
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (account_id, occurred_at);
```

### Account Velocity Counters (Materialized View)

Velocity rules are the backbone of real-time fraud detection. How many transactions has this account made in the last 1 hour?

```sql
CREATE TABLE account_velocity_1h
(
    account_id      String,
    window_start    DateTime,
    tx_count        AggregateFunction(count),
    total_amount    AggregateFunction(sum, Decimal(18, 4)),
    distinct_merchants AggregateFunction(uniq, String),
    distinct_countries AggregateFunction(uniq, String),
    distinct_devices AggregateFunction(uniq, String)
)
ENGINE = AggregatingMergeTree()
ORDER BY (account_id, window_start);

CREATE MATERIALIZED VIEW account_velocity_1h_mv TO account_velocity_1h
AS
SELECT
    account_id,
    toStartOfHour(occurred_at)     AS window_start,
    countState()                   AS tx_count,
    sumState(amount_usd)           AS total_amount,
    uniqState(merchant_id)         AS distinct_merchants,
    uniqState(merchant_country)    AS distinct_countries,
    uniqState(device_id)           AS distinct_devices
FROM transaction_events
GROUP BY account_id, window_start;
```

### Card Velocity (24 Hours)

```sql
CREATE TABLE card_velocity_24h
(
    card_id         String,
    window_start    DateTime,
    tx_count        AggregateFunction(count),
    total_amount    AggregateFunction(sum, Decimal(18, 4)),
    distinct_countries AggregateFunction(uniq, String),
    distinct_ips    AggregateFunction(uniq, IPv4)
)
ENGINE = AggregatingMergeTree()
ORDER BY (card_id, window_start);

CREATE MATERIALIZED VIEW card_velocity_24h_mv TO card_velocity_24h
AS
SELECT
    card_id,
    toStartOfDay(occurred_at)     AS window_start,
    countState()                  AS tx_count,
    sumState(amount_usd)          AS total_amount,
    uniqState(merchant_country)   AS distinct_countries,
    uniqState(ip_address)         AS distinct_ips
FROM transaction_events
GROUP BY card_id, window_start;
```

## Velocity Check Queries

### Account Transaction Count - Last Hour

```sql
SELECT
    account_id,
    countMerge(tx_count)          AS tx_count_1h,
    sumMerge(total_amount)        AS total_amount_1h,
    uniqMerge(distinct_merchants) AS merchants_1h,
    uniqMerge(distinct_countries) AS countries_1h,
    uniqMerge(distinct_devices)   AS devices_1h
FROM account_velocity_1h
WHERE account_id = 'acct-5001'
  AND window_start >= toStartOfHour(now() - INTERVAL 1 HOUR)
GROUP BY account_id;
```

### Card Used in Multiple Countries in 10 Minutes

This is a classic card-not-present fraud signal:

```sql
SELECT
    t1.card_id,
    t1.transaction_id        AS tx1_id,
    t1.merchant_country      AS country1,
    t1.occurred_at           AS time1,
    t2.transaction_id        AS tx2_id,
    t2.merchant_country      AS country2,
    t2.occurred_at           AS time2,
    dateDiff('minute', t1.occurred_at, t2.occurred_at) AS minutes_apart
FROM transaction_events AS t1
JOIN transaction_events AS t2
    ON t1.card_id = t2.card_id
    AND t1.merchant_country != t2.merchant_country
    AND t2.occurred_at > t1.occurred_at
    AND t2.occurred_at <= t1.occurred_at + INTERVAL 10 MINUTE
WHERE t1.occurred_at >= now() - INTERVAL 1 HOUR
ORDER BY minutes_apart;
```

## Fraud Rule Scoring

Combine multiple signals into a composite fraud score:

```sql
WITH velocity AS (
    SELECT
        account_id,
        countMerge(tx_count)          AS tx_count_1h,
        sumMerge(total_amount)        AS total_amount_1h,
        uniqMerge(distinct_countries) AS countries_1h,
        uniqMerge(distinct_devices)   AS devices_1h
    FROM account_velocity_1h
    WHERE window_start >= toStartOfHour(now() - INTERVAL 1 HOUR)
    GROUP BY account_id
),
recent_tx AS (
    SELECT
        t.transaction_id,
        t.account_id,
        t.amount_usd,
        t.merchant_category,
        t.is_online,
        t.occurred_at,
        v.tx_count_1h,
        v.total_amount_1h,
        v.countries_1h,
        v.devices_1h,
        -- Rule scores
        if(v.tx_count_1h > 15,          30, 0)  AS score_high_velocity,
        if(v.total_amount_1h > 5000,     25, 0)  AS score_high_amount,
        if(v.countries_1h > 1,           40, 0)  AS score_multi_country,
        if(v.devices_1h > 3,             20, 0)  AS score_device_switching,
        if(t.amount_usd > 2000 AND t.is_online = 1, 15, 0) AS score_large_online
    FROM transaction_events AS t
    LEFT JOIN velocity AS v ON t.account_id = v.account_id
    WHERE t.occurred_at >= now() - INTERVAL 5 MINUTE
      AND t.status = 'pending'
)
SELECT
    transaction_id,
    account_id,
    amount_usd,
    score_high_velocity + score_high_amount + score_multi_country +
        score_device_switching + score_large_online AS fraud_score,
    score_high_velocity,
    score_high_amount,
    score_multi_country,
    score_device_switching,
    score_large_online
FROM recent_tx
ORDER BY fraud_score DESC;
```

## Historical Fraud Rate by Merchant Category

```sql
SELECT
    merchant_category,
    count()                               AS total_transactions,
    countIf(fraud_label = 1)              AS confirmed_fraud,
    round(avg(fraud_label) * 100, 4)      AS fraud_rate_pct,
    avg(amount_usd)                       AS avg_amount,
    avgIf(amount_usd, fraud_label = 1)    AS avg_fraud_amount
FROM transaction_events
WHERE occurred_at >= now() - INTERVAL 90 DAY
GROUP BY merchant_category
ORDER BY fraud_rate_pct DESC;
```

## Device Fingerprint Reuse Across Accounts

A device being used by multiple accounts in a short window is a strong fraud signal:

```sql
SELECT
    device_id,
    count(DISTINCT account_id) AS account_count,
    groupArray(DISTINCT account_id) AS accounts,
    count()                    AS total_transactions,
    min(occurred_at)           AS first_seen,
    max(occurred_at)           AS last_seen
FROM transaction_events
WHERE occurred_at >= now() - INTERVAL 24 HOUR
  AND device_id != ''
GROUP BY device_id
HAVING account_count > 1
ORDER BY account_count DESC;
```

## IP Address Abuse Detection

```sql
SELECT
    ip_address,
    count(DISTINCT account_id) AS unique_accounts,
    count(DISTINCT card_id)    AS unique_cards,
    count()                    AS transactions,
    countIf(fraud_label = 1)   AS known_fraud_count
FROM transaction_events
WHERE occurred_at >= now() - INTERVAL 1 HOUR
GROUP BY ip_address
HAVING unique_accounts > 3 OR known_fraud_count > 0
ORDER BY known_fraud_count DESC, unique_accounts DESC;
```

## Retroactive Fraud Labeling

When the fraud team confirms a transaction as fraud, update the label using a mutation:

```sql
-- Insert a corrected row (ClickHouse is append-only, use CollapsingMergeTree for updates)
-- Or use lightweight deletes available in ClickHouse 22.8+
ALTER TABLE transaction_events
    UPDATE fraud_label = 1
    WHERE transaction_id = 'tx-99999';
```

For high-frequency label updates, consider a separate fraud labels table joined at query time:

```sql
CREATE TABLE fraud_labels
(
    transaction_id  String,
    fraud_label     UInt8,
    labeled_at      DateTime DEFAULT now(),
    labeled_by      String
)
ENGINE = ReplacingMergeTree(labeled_at)
ORDER BY transaction_id;
```

## Conclusion

ClickHouse is a powerful analytical layer in a fraud detection system. Velocity counters via materialized views give you sub-millisecond lookup of recent activity. Self-join and aggregation queries detect behavioral patterns like impossible-speed travel or device reuse across accounts. Rule-based scoring queries combine multiple signals into actionable fraud scores that a decision engine can act on in real time.

**Related Reading:**

- [How to Detect Anomalies in Time-Series Data with ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-anomaly-detection-time-series/view)
- [What Is CollapsingMergeTree and When to Use It](https://oneuptime.com/blog/post/2026-03-31-clickhouse-collapsingmergetree-guide/view)
- [What Is the Difference Between Mutations and Lightweight Deletes in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mutations-vs-lightweight-deletes/view)
