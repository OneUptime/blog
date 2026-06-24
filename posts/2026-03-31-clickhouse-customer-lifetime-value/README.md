# How to Calculate Customer Lifetime Value with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Customer Lifetime Value, CLV, Cohort, Analytics

Description: Learn how to calculate historical and predictive Customer Lifetime Value in ClickHouse using cohort revenue aggregation and linear regression extrapolation.

---

## Customer Lifetime Value

Customer Lifetime Value (CLV) is the total revenue a customer generates over their relationship with your business. Historical CLV is straightforward: sum all purchases per customer. Predictive CLV requires extrapolating from observed patterns.

## Historical CLV

Compute total revenue per customer:

```sql
SELECT
    customer_id,
    count() AS total_orders,
    sum(order_value) AS total_revenue,
    min(order_time) AS first_purchase,
    max(order_time) AS last_purchase,
    dateDiff('day', min(order_time), max(order_time)) AS customer_age_days,
    round(sum(order_value) / nullIf(count(), 0), 2) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY customer_id
ORDER BY total_revenue DESC
LIMIT 100;
```

## CLV by Cohort

Compare lifetime value across monthly acquisition cohorts:

```sql
SELECT
    toYYYYMM(first_purchase) AS cohort_month,
    count(DISTINCT customer_id) AS customers,
    sum(total_revenue) AS cohort_revenue,
    round(sum(total_revenue) / count(DISTINCT customer_id), 2) AS avg_clv
FROM (
    SELECT
        customer_id,
        min(order_time) AS first_purchase,
        sum(order_value) AS total_revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY customer_id
)
WHERE first_purchase >= toDate('2024-01-01')
GROUP BY cohort_month
ORDER BY cohort_month;
```

## CLV at N Months

Calculate CLV at specific tenure milestones:

```sql
SELECT
    toYYYYMM(first_order) AS cohort,
    round(sumIf(order_value,
        dateDiff('day', first_order, order_time) <= 30) / uniq(customer_id), 2) AS clv_30d,
    round(sumIf(order_value,
        dateDiff('day', first_order, order_time) <= 90) / uniq(customer_id), 2) AS clv_90d,
    round(sumIf(order_value,
        dateDiff('day', first_order, order_time) <= 365) / uniq(customer_id), 2) AS clv_365d
FROM orders o
JOIN (SELECT customer_id, min(order_time) AS first_order FROM orders GROUP BY customer_id) f
    USING customer_id
WHERE o.status = 'completed'
GROUP BY cohort
ORDER BY cohort;
```

## CLV Segments

Classify customers into value tiers for targeting:

```sql
SELECT
    customer_id,
    total_revenue,
    CASE
        WHEN total_revenue >= 1000 THEN 'champion'
        WHEN total_revenue >= 500 THEN 'loyal'
        WHEN total_revenue >= 100 THEN 'potential'
        ELSE 'new'
    END AS clv_segment
FROM (
    SELECT customer_id, sum(order_value) AS total_revenue
    FROM orders WHERE status = 'completed'
    GROUP BY customer_id
)
ORDER BY total_revenue DESC;
```

## Predictive CLV with Linear Extrapolation

Extrapolate future revenue using observed purchase rates:

```sql
SELECT
    customer_id,
    total_revenue,
    total_orders,
    customer_age_days,
    round(
        total_revenue / nullIf(customer_age_days, 0) * 365,
        2
    ) AS predicted_annual_clv
FROM (
    SELECT
        customer_id,
        sum(order_value) AS total_revenue,
        count() AS total_orders,
        dateDiff('day', min(order_time), now()) AS customer_age_days
    FROM orders WHERE status = 'completed'
    GROUP BY customer_id
    HAVING customer_age_days > 30
)
ORDER BY predicted_annual_clv DESC
LIMIT 100;
```

## Summary

ClickHouse calculates CLV by aggregating purchase history per customer, segmenting cohorts by acquisition month, and comparing value at tenure milestones. Simple linear extrapolation from observed purchase rates provides predictive CLV without external ML tools. CLV segments enable targeted retention campaigns for high-value customers.
