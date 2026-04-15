# How to Track Transaction Patterns for AML in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, AML, Transaction, Finance, Fraud Detection, Analytics

Description: Use ClickHouse to detect anti-money laundering patterns in transaction data through velocity checks, structuring detection, and network analysis.

---

Anti-money laundering (AML) analytics requires examining large volumes of transactions to identify suspicious behavioral patterns such as structuring, layering, and rapid fund movement. ClickHouse handles this workload efficiently.

## Transaction Schema for AML

```sql
CREATE TABLE transactions (
    txn_id        UUID,
    account_id    UInt64,
    counterparty  UInt64,
    amount        Decimal64(2),
    currency      LowCardinality(String),
    txn_type      LowCardinality(String),  -- wire, cash, transfer, check
    channel       LowCardinality(String),
    country       LowCardinality(String),
    created_at    DateTime,
    is_flagged    UInt8 DEFAULT 0
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (account_id, created_at);
```

## Velocity Check - Transactions Per Account Per Hour

Flag accounts with unusually high transaction frequency:

```sql
SELECT
    account_id,
    toStartOfHour(created_at) AS hour,
    count() AS txn_count,
    sum(amount) AS total_amount
FROM transactions
WHERE created_at >= now() - INTERVAL 24 HOUR
GROUP BY account_id, hour
HAVING txn_count > 20
ORDER BY txn_count DESC;
```

## Structuring Detection (Smurfing)

Detect multiple transactions just below reporting thresholds (e.g., $10,000):

```sql
SELECT
    account_id,
    toDate(created_at) AS txn_date,
    count() AS txn_count,
    sum(amount) AS daily_total,
    countIf(amount BETWEEN 9000 AND 9999) AS near_threshold_count
FROM transactions
WHERE created_at >= today() - 30
  AND txn_type = 'cash'
GROUP BY account_id, txn_date
HAVING near_threshold_count >= 3
ORDER BY near_threshold_count DESC;
```

## Layering Detection - Rapid Round-Trip Transfers

Identify funds that move out and back within a short window:

```sql
SELECT
    t1.account_id,
    t1.counterparty,
    t1.amount,
    t1.created_at AS sent_at,
    t2.created_at AS returned_at,
    dateDiff('hour', t1.created_at, t2.created_at) AS hours_between
FROM transactions t1
JOIN transactions t2
    ON t1.account_id = t2.counterparty
    AND t1.counterparty = t2.account_id
    AND t2.created_at > t1.created_at
    AND dateDiff('hour', t1.created_at, t2.created_at) <= 48
    AND abs(t1.amount - t2.amount) < 100
WHERE t1.created_at >= today() - 14
ORDER BY hours_between;
```

## High-Risk Country Transaction Monitoring

Flag transactions involving jurisdictions on watchlists:

```sql
SELECT
    account_id,
    country,
    count() AS txn_count,
    sum(amount) AS total_amount,
    max(created_at) AS last_txn
FROM transactions
WHERE country IN ('XX', 'YY', 'ZZ')  -- replace with actual high-risk country codes
  AND created_at >= today() - 90
GROUP BY account_id, country
ORDER BY total_amount DESC
LIMIT 100;
```

## Running Balance Anomaly

Detect sudden large spikes in daily outflows per account:

```sql
SELECT
    account_id,
    txn_date,
    outflow,
    avg_7d_outflow,
    outflow / avg_7d_outflow AS spike_ratio
FROM (
    SELECT
        account_id,
        toDate(created_at) AS txn_date,
        sumIf(amount, txn_type IN ('wire', 'transfer')) AS outflow,
        avg(sumIf(amount, txn_type IN ('wire', 'transfer')))
            OVER (PARTITION BY account_id ORDER BY txn_date ROWS BETWEEN 6 PRECEDING AND 1 PRECEDING)
            AS avg_7d_outflow
    FROM transactions
    WHERE created_at >= today() - 60
    GROUP BY account_id, txn_date
)
WHERE avg_7d_outflow > 0
  AND outflow / avg_7d_outflow > 5
ORDER BY spike_ratio DESC;
```

## Summary

ClickHouse enables AML teams to run complex pattern queries - velocity checks, structuring detection, and fund-flow analysis - across billions of transactions in seconds. Partitioning by month, combined with proper ORDER BY keys, keeps query times low even as the dataset grows. These queries form the analytical backbone of a real-time AML monitoring system.
