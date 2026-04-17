# How to Analyze Customer Spending Patterns with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Customer, Spending, Finance, Segmentation, Analytics

Description: Analyze customer spending behavior in ClickHouse - category breakdowns, seasonal trends, cohort comparisons, and top merchant identification.

---

Understanding how customers spend money enables personalized offers, risk management, and churn prediction. ClickHouse can aggregate millions of transactions per customer across long time windows to surface behavioral patterns.

## Spending Events Table

```sql
CREATE TABLE customer_transactions (
    txn_id       UUID,
    customer_id  UInt64,
    merchant_id  UInt64,
    merchant_name String,
    category     LowCardinality(String),
    sub_category LowCardinality(String),
    amount       Decimal64(2),
    currency     LowCardinality(String),
    channel      LowCardinality(String),  -- online, in_store, mobile
    txn_date     Date,
    created_at   DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(txn_date)
ORDER BY (customer_id, txn_date);
```

## Spending by Category

Break down customer spend by merchant category over the last 90 days:

```sql
SELECT
    customer_id,
    category,
    count() AS txn_count,
    sum(amount) AS total_spend,
    round(sum(amount) / sum(sum(amount)) OVER (PARTITION BY customer_id) * 100, 2) AS share_pct
FROM customer_transactions
WHERE txn_date >= today() - 90
GROUP BY customer_id, category
ORDER BY customer_id, total_spend DESC;
```

## Month-over-Month Spending Change

Detect customers with significant spending increases or decreases:

```sql
SELECT
    customer_id,
    sumIf(amount, txn_date >= today() - 30) AS spend_current_month,
    sumIf(amount, txn_date BETWEEN today() - 60 AND today() - 31) AS spend_prior_month,
    round((spend_current_month - spend_prior_month) / nullIf(spend_prior_month, 0) * 100, 2) AS mom_change_pct
FROM customer_transactions
WHERE txn_date >= today() - 60
GROUP BY customer_id
ORDER BY mom_change_pct DESC
LIMIT 100;
```

## Top Merchants Per Customer

Identify most-visited merchants for personalization:

```sql
SELECT *
FROM (
    SELECT
        customer_id,
        merchant_name,
        count() AS visits,
        sum(amount) AS total_spend,
        row_number() OVER (PARTITION BY customer_id ORDER BY sum(amount) DESC) AS merchant_rank
    FROM customer_transactions
    WHERE txn_date >= today() - 90
    GROUP BY customer_id, merchant_name
)
WHERE merchant_rank <= 5
ORDER BY customer_id, merchant_rank;
```

## Weekend vs. Weekday Spending

Compare spending behavior across days of the week:

```sql
SELECT
    customer_id,
    sumIf(amount, toDayOfWeek(txn_date) IN (6, 7)) AS weekend_spend,
    sumIf(amount, toDayOfWeek(txn_date) NOT IN (6, 7)) AS weekday_spend,
    round(weekend_spend / (weekend_spend + weekday_spend) * 100, 2) AS weekend_share_pct
FROM customer_transactions
WHERE txn_date >= today() - 90
GROUP BY customer_id
ORDER BY weekend_share_pct DESC;
```

## High-Value Customer Segmentation

Segment customers by total annual spend:

```sql
SELECT
    customer_id,
    sum(amount) AS annual_spend,
    multiIf(
        annual_spend >= 50000, 'Platinum',
        annual_spend >= 20000, 'Gold',
        annual_spend >= 5000, 'Silver',
        'Standard'
    ) AS segment
FROM customer_transactions
WHERE txn_date >= today() - 365
GROUP BY customer_id
ORDER BY annual_spend DESC;
```

## Summary

ClickHouse enables deep spending analysis across millions of customer transactions with fast category breakdowns, trend comparisons, and merchant ranking queries. These insights drive personalization engines, fraud detection models, and customer segmentation programs.
