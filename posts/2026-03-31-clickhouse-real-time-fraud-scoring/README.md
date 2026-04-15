# How to Build Real-Time Fraud Scoring with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Fraud Detection, Real-Time Analytics, Risk Scoring, Analytics

Description: Build a real-time fraud scoring pipeline in ClickHouse by aggregating transaction signals into risk features and querying them in milliseconds.

---

Fraud teams need to score transactions in near-real-time, often within 100 ms. ClickHouse provides the aggregation speed to compute risk features at query time without a separate feature store.

## Transaction Table

```sql
CREATE TABLE transactions
(
    tx_id       UUID,
    user_id     UInt64,
    amount      Decimal(18, 4),
    merchant_id UInt32,
    country     LowCardinality(String),
    status      LowCardinality(String),
    ts          DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (user_id, ts);
```

## Pre-Aggregated Risk Features

Use a materialized view to maintain rolling counts per user:

```sql
CREATE MATERIALIZED VIEW user_risk_mv
ENGINE = AggregatingMergeTree()
ORDER BY (user_id, window_start)
AS
SELECT
    user_id,
    toStartOfHour(ts) AS window_start,
    countState()            AS tx_count_state,
    sumState(amount)        AS amount_sum_state,
    uniqState(merchant_id)  AS merchant_count_state,
    uniqState(country)      AS country_count_state
FROM transactions
GROUP BY user_id, window_start;
```

## Fraud Score Query

```sql
SELECT
    user_id,
    countMerge(tx_count_state)           AS tx_count_1h,
    sumMerge(amount_sum_state)           AS amount_sum_1h,
    uniqMerge(merchant_count_state)      AS merchant_count_1h,
    uniqMerge(country_count_state)       AS country_count_1h,
    -- simple linear risk score
    tx_count_1h * 0.3
        + amount_sum_1h / 1000 * 0.4
        + merchant_count_1h * 0.2
        + country_count_1h * 0.1 AS risk_score
FROM user_risk_mv
WHERE user_id = 9001
  AND window_start >= now() - INTERVAL 1 HOUR
GROUP BY user_id;
```

## Streaming Ingestion

Feed transactions from Kafka to keep the view current:

```bash
# example Kafka producer config
kafka-console-producer \
  --bootstrap-server broker:9092 \
  --topic transactions
```

```sql
CREATE TABLE transactions_kafka
(
    tx_id       UUID,
    user_id     UInt64,
    amount      Decimal(18, 4),
    merchant_id UInt32,
    country     LowCardinality(String),
    status      LowCardinality(String),
    ts          DateTime
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'broker:9092',
    kafka_topic_list  = 'transactions',
    kafka_group_name  = 'ch-fraud',
    kafka_format      = 'JSONEachRow';

CREATE MATERIALIZED VIEW transactions_kafka_mv TO transactions AS
SELECT * FROM transactions_kafka;
```

## Threshold Alerting

Export `risk_score` to [OneUptime](https://oneuptime.com) as a metric. Configure an alert when the 5-minute average risk score across all transactions exceeds your threshold, giving your fraud operations team a heads-up before manual review queues overflow.

## Summary

ClickHouse AggregatingMergeTree materialized views maintain rolling risk features in real time. A single query aggregates those features into a fraud score in milliseconds, making ClickHouse a practical fraud-scoring backend without a separate feature store.
