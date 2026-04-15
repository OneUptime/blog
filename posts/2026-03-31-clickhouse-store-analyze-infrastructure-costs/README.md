# How to Store and Analyze Infrastructure Costs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Infrastructure Cost, FinOps, Cloud Billing, Cost Attribution

Description: Learn how to load cloud billing data into ClickHouse and query cost trends, attribution by team or service, and anomaly detection.

---

Infrastructure cost management requires querying billing data across hundreds of services, teams, and resource types. Cloud providers export billing data in large CSV or Parquet files that are cumbersome to query in spreadsheets. Loading them into ClickHouse enables fast SQL analysis, anomaly detection, and cost attribution at any granularity.

## Schema

```sql
CREATE TABLE infra_costs
(
    usage_date   Date,
    provider     LowCardinality(String),  -- 'aws','gcp','azure'
    service      LowCardinality(String),  -- 'EC2','S3','RDS','GKE'
    resource_id  String,
    region       LowCardinality(String),
    team         LowCardinality(String),
    environment  LowCardinality(String),  -- 'prod','staging','dev'
    usage_amount Float64,
    usage_unit   LowCardinality(String),
    cost_usd     Decimal(12, 6)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(usage_date)
ORDER BY (usage_date, provider, service, team);
```

## Monthly Cost by Team

```sql
SELECT
    team,
    sum(cost_usd) AS total_cost
FROM infra_costs
WHERE toStartOfMonth(usage_date) = toStartOfMonth(today())
GROUP BY team
ORDER BY total_cost DESC;
```

## Cost Trend by Service

```sql
SELECT
    toStartOfMonth(usage_date) AS month,
    service,
    sum(cost_usd)              AS monthly_cost
FROM infra_costs
WHERE usage_date >= today() - INTERVAL 6 MONTH
GROUP BY month, service
ORDER BY month, monthly_cost DESC;
```

## Day-over-Day Cost Anomalies

```sql
WITH daily AS (
    SELECT
        usage_date,
        service,
        sum(cost_usd) AS daily_cost
    FROM infra_costs
    GROUP BY usage_date, service
),
enriched AS (
    SELECT
        service,
        usage_date,
        daily_cost,
        avg(daily_cost) OVER (
            PARTITION BY service
            ORDER BY usage_date
            ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
        ) AS rolling_avg
    FROM daily
)
SELECT
    service,
    usage_date,
    daily_cost,
    rolling_avg,
    daily_cost / (rolling_avg + 0.01) AS spike_ratio
FROM enriched
WHERE daily_cost / (rolling_avg + 0.01) > 2
ORDER BY spike_ratio DESC
LIMIT 20;
```

## Top 10 Most Expensive Resources

```sql
SELECT
    resource_id,
    service,
    team,
    sum(cost_usd) AS total_cost
FROM infra_costs
WHERE usage_date >= today() - 30
GROUP BY resource_id, service, team
ORDER BY total_cost DESC
LIMIT 10;
```

## Prod vs Non-Prod Cost Split

```sql
SELECT
    environment,
    sum(cost_usd) AS cost,
    sum(cost_usd) * 100.0 / sum(sum(cost_usd)) OVER () AS pct
FROM infra_costs
WHERE toStartOfMonth(usage_date) = toStartOfMonth(today())
GROUP BY environment;
```

## Budget Variance

```sql
SELECT
    team,
    sum(cost_usd) AS actual,
    any(monthly_budget) AS budget,
    sum(cost_usd) - any(monthly_budget) AS variance
FROM infra_costs
JOIN team_budgets USING (team)
WHERE toStartOfMonth(usage_date) = toStartOfMonth(today())
GROUP BY team
ORDER BY variance DESC;
```

## Summary

ClickHouse is a powerful FinOps tool for infrastructure cost analysis. Import cloud billing exports, then query cost by team, service, and environment, detect day-over-day anomalies with rolling averages, and compare actual spend against budgets. This replaces slow spreadsheet analysis with SQL queries that complete in seconds across months of billing history.
