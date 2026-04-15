# How to Build Utility Billing Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Utility, Billing, Analytics, Tariff, Revenue

Description: Build utility billing analytics in ClickHouse to compute bill amounts, track revenue by tariff, analyze payment trends, and identify billing anomalies.

---

Utility billing analytics involves computing consumption charges across tiered tariff structures, tracking revenue by customer segment, and identifying billing anomalies like unbilled accounts or unusual consumption. ClickHouse handles the volume and complexity of large-scale billing data.

## Bill Calculation Table

```sql
CREATE TABLE utility_bills (
    bill_id          String,
    customer_id      UInt64,
    account_number   String,
    district         LowCardinality(String),
    tariff_code      LowCardinality(String),
    customer_class   LowCardinality(String),  -- residential, commercial, industrial
    bill_period_start Date,
    bill_period_end   Date,
    consumption_kwh   Float64,
    demand_kw         Float32,
    energy_charge     Decimal64(2),
    demand_charge     Decimal64(2),
    fixed_charge      Decimal64(2),
    taxes             Decimal64(2),
    total_amount      Decimal64(2),
    due_date          Date,
    paid_date         Nullable(Date),
    status            LowCardinality(String)  -- issued, paid, overdue, disputed
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(bill_period_end)
ORDER BY (customer_id, bill_period_end);
```

## Monthly Revenue by Tariff

```sql
SELECT
    toStartOfMonth(bill_period_end) AS month,
    tariff_code,
    customer_class,
    count() AS bill_count,
    sum(consumption_kwh) AS total_kwh,
    sum(energy_charge) AS energy_revenue,
    sum(demand_charge) AS demand_revenue,
    sum(total_amount) AS total_revenue
FROM utility_bills
WHERE bill_period_end >= today() - 365
GROUP BY month, tariff_code, customer_class
ORDER BY month, total_revenue DESC;
```

## Tiered Consumption Analysis

Understand what tier most residential customers fall into:

```sql
SELECT
    tariff_code,
    toStartOfMonth(bill_period_end) AS month,
    countIf(consumption_kwh < 500) AS tier1_customers,
    countIf(consumption_kwh BETWEEN 500 AND 1000) AS tier2_customers,
    countIf(consumption_kwh > 1000) AS tier3_customers,
    avg(consumption_kwh) AS avg_consumption,
    avg(total_amount) AS avg_bill_amount
FROM utility_bills
WHERE customer_class = 'residential'
  AND bill_period_end >= today() - 90
GROUP BY tariff_code, month
ORDER BY month, tariff_code;
```

## Payment Collection Rate

```sql
SELECT
    toStartOfMonth(bill_period_end) AS month,
    count() AS bills_issued,
    countIf(status = 'paid') AS bills_paid,
    sum(total_amount) AS amount_billed,
    sumIf(total_amount, status = 'paid') AS amount_collected,
    round(sumIf(total_amount, status = 'paid') / sum(total_amount) * 100, 2) AS collection_rate_pct
FROM utility_bills
WHERE bill_period_end >= today() - 180
GROUP BY month
ORDER BY month;
```

## Billing Anomaly Detection

Flag accounts with unusually high consumption vs. prior periods:

```sql
SELECT
    customer_id,
    account_number,
    bill_period_end,
    current_consumption,
    avg_12_month,
    current_consumption / nullIf(avg_12_month, 0) AS consumption_ratio
FROM (
    SELECT
        customer_id,
        account_number,
        bill_period_end,
        consumption_kwh AS current_consumption,
        avg(consumption_kwh) OVER (
            PARTITION BY customer_id
            ORDER BY bill_period_end
            ROWS BETWEEN 12 PRECEDING AND 1 PRECEDING
        ) AS avg_12_month
    FROM utility_bills
    WHERE bill_period_end >= today() - 90
)
WHERE current_consumption / nullIf(avg_12_month, 0) > 3
ORDER BY consumption_ratio DESC
LIMIT 100;
```

## Overdue Balance by Customer Class

```sql
SELECT
    customer_class,
    district,
    countIf(status = 'overdue') AS overdue_accounts,
    sumIf(total_amount, status = 'overdue') AS overdue_balance
FROM utility_bills
WHERE due_date < today()
  AND status = 'overdue'
GROUP BY customer_class, district
ORDER BY overdue_balance DESC;
```

## Summary

ClickHouse makes utility billing analytics straightforward - revenue by tariff, tiered consumption distribution, collection rates, and anomaly detection are all computed with fast SQL aggregations. MergeTree with partitioning by billing period keeps historical analyses efficient across millions of customer accounts.
