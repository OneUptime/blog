# How to Analyze GCP Billing Data in BigQuery Using Example Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Billing Analysis, SQL, Cost Management, Google Cloud

Description: A collection of practical BigQuery SQL queries for analyzing your Google Cloud billing data to find cost patterns, anomalies, and optimization opportunities.

---

Once you have GCP billing data flowing into BigQuery, the real work begins: making sense of it. Raw billing data contains millions of rows with nested fields, credits, labels, and SKU details that can be overwhelming at first glance. The right SQL queries transform that data into actionable insights.

This post is a cookbook of queries I use regularly for billing analysis. Each one answers a specific question about your cloud spending, and you can adapt them to fit your specific setup.

## Prerequisites

Before running these queries, you need:

- Billing export enabled to BigQuery (standard or detailed)
- Access to the BigQuery dataset containing the billing export
- The table name, which looks like `gcp_billing_export_v1_XXXXXX` where XXXXXX is your billing account ID

Replace `my-project.billing.gcp_billing_export_v1_XXXXXX` in all queries below with your actual table reference.

## Understanding the Billing Schema

The billing export table has some nested fields that you need to know how to work with:

- **credits**: An array of credit objects (SUDs, CUDs, free tier, promotions)
- **labels**: An array of key-value pairs from resource labels
- **system_labels**: GCP-managed labels
- **project**: A struct with id, name, and other fields
- **location**: A struct with region, zone, and country

For net cost (what you actually pay), you need to add cost and credits together:

```sql
-- Basic net cost formula
-- Credits are negative, so adding them to cost gives you the net amount
SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost
```

## Query 1: Total Monthly Spend

The most basic question: how much are we spending each month?

```sql
-- Total monthly spend with cost and credit breakdown
SELECT
  FORMAT_TIMESTAMP('%Y-%m', usage_start_time) AS month,
  ROUND(SUM(cost), 2) AS gross_cost,
  ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS total_credits,
  ROUND(
    SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)),
    2
  ) AS net_cost
FROM
  `my-project.billing.gcp_billing_export_v1_XXXXXX`
GROUP BY month
ORDER BY month DESC
LIMIT 12
```

## Query 2: Cost Breakdown by Service

Which GCP services are eating your budget?

```sql
-- Top 15 services by cost in the last 30 days
SELECT
  service.description AS service,
  ROUND(
    SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)),
    2
  ) AS net_cost,
  COUNT(DISTINCT project.id) AS project_count
FROM
  `my-project.billing.gcp_billing_export_v1_XXXXXX`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY service
HAVING net_cost > 0
ORDER BY net_cost DESC
LIMIT 15
```

## Query 3: Cost by Project with Month-Over-Month Change

See which projects are growing in cost:

```sql
-- Project costs with month-over-month comparison
WITH monthly_project_costs AS (
  SELECT
    project.name AS project_name,
    FORMAT_TIMESTAMP('%Y-%m', usage_start_time) AS month,
    ROUND(
      SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)),
      2
    ) AS net_cost
  FROM
    `my-project.billing.gcp_billing_export_v1_XXXXXX`
  WHERE
    usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY)
  GROUP BY project_name, month
)
SELECT
  current_month.project_name,
  current_month.month AS current_month,
  current_month.net_cost AS current_cost,
  prev_month.net_cost AS previous_cost,
  ROUND(current_month.net_cost - IFNULL(prev_month.net_cost, 0), 2) AS cost_change,
  CASE
    WHEN prev_month.net_cost > 0
    THEN ROUND((current_month.net_cost - prev_month.net_cost) / prev_month.net_cost * 100, 1)
    ELSE NULL
  END AS pct_change
FROM monthly_project_costs current_month
LEFT JOIN monthly_project_costs prev_month
  ON current_month.project_name = prev_month.project_name
  AND prev_month.month = FORMAT_TIMESTAMP('%Y-%m',
    TIMESTAMP_SUB(PARSE_TIMESTAMP('%Y-%m', current_month.month), INTERVAL 1 MONTH))
WHERE current_month.month = FORMAT_TIMESTAMP('%Y-%m', CURRENT_TIMESTAMP())
ORDER BY current_month.net_cost DESC
```

## Query 4: Credit Breakdown

Understand what types of credits you are receiving:

```sql
-- Breakdown of credits by type
SELECT
  credit.name AS credit_type,
  credit.type AS credit_category,
  ROUND(SUM(credit.amount), 2) AS total_credit_amount
FROM
  `my-project.billing.gcp_billing_export_v1_XXXXXX`,
  UNNEST(credits) AS credit
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY credit_type, credit_category
ORDER BY total_credit_amount ASC
```

This shows you how much you are saving from Sustained Use Discounts, Committed Use Discounts, free tier, and promotional credits.

## Query 5: Daily Cost Anomaly Detection

Find days where spending was significantly above normal:

```sql
-- Detect daily cost anomalies using standard deviation
WITH daily_costs AS (
  SELECT
    DATE(usage_start_time) AS date,
    ROUND(
      SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)),
      2
    ) AS daily_cost
  FROM
    `my-project.billing.gcp_billing_export_v1_XXXXXX`
  WHERE
    usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  GROUP BY date
),
stats AS (
  SELECT
    AVG(daily_cost) AS avg_cost,
    STDDEV(daily_cost) AS stddev_cost
  FROM daily_costs
)
SELECT
  d.date,
  d.daily_cost,
  ROUND(s.avg_cost, 2) AS avg_daily_cost,
  ROUND((d.daily_cost - s.avg_cost) / s.stddev_cost, 2) AS z_score,
  CASE
    WHEN (d.daily_cost - s.avg_cost) / s.stddev_cost > 2 THEN 'HIGH ANOMALY'
    WHEN (d.daily_cost - s.avg_cost) / s.stddev_cost > 1.5 THEN 'MODERATE ANOMALY'
    ELSE 'NORMAL'
  END AS status
FROM daily_costs d
CROSS JOIN stats s
ORDER BY d.date DESC
```

## Query 6: Top Expensive SKUs

Drill into the specific line items driving your costs:

```sql
-- Top 20 most expensive SKUs with usage details
SELECT
  service.description AS service,
  sku.description AS sku,
  usage.pricing_unit,
  ROUND(SUM(usage.amount_in_pricing_units), 2) AS total_usage,
  ROUND(SUM(cost), 2) AS total_cost,
  ROUND(
    SAFE_DIVIDE(SUM(cost), SUM(usage.amount_in_pricing_units)),
    6
  ) AS unit_price
FROM
  `my-project.billing.gcp_billing_export_v1_XXXXXX`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND cost > 0
GROUP BY service, sku, pricing_unit
ORDER BY total_cost DESC
LIMIT 20
```

## Query 7: Cost by Label (Team, Environment)

Track spending by organizational dimensions:

```sql
-- Cost by team and environment labels
SELECT
  IFNULL(
    (SELECT value FROM UNNEST(labels) WHERE key = 'team'),
    'unlabeled'
  ) AS team,
  IFNULL(
    (SELECT value FROM UNNEST(labels) WHERE key = 'env'),
    'unlabeled'
  ) AS environment,
  ROUND(
    SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)),
    2
  ) AS net_cost,
  COUNT(DISTINCT project.id) AS projects_used
FROM
  `my-project.billing.gcp_billing_export_v1_XXXXXX`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY team, environment
HAVING net_cost > 1
ORDER BY net_cost DESC
```

## Query 8: Compute Engine Cost Deep Dive

Break down Compute Engine costs into categories:

```sql
-- Compute Engine cost breakdown by SKU category
SELECT
  CASE
    WHEN sku.description LIKE '%Core%' THEN 'vCPU'
    WHEN sku.description LIKE '%Ram%' OR sku.description LIKE '%Memory%' THEN 'Memory'
    WHEN sku.description LIKE '%Disk%' OR sku.description LIKE '%SSD%'
      OR sku.description LIKE '%Storage%' THEN 'Disk'
    WHEN sku.description LIKE '%Network%' OR sku.description LIKE '%Egress%' THEN 'Network'
    WHEN sku.description LIKE '%License%' THEN 'Licensing'
    WHEN sku.description LIKE '%GPU%' THEN 'GPU'
    ELSE 'Other'
  END AS cost_category,
  ROUND(SUM(cost), 2) AS gross_cost,
  ROUND(
    SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)),
    2
  ) AS net_cost
FROM
  `my-project.billing.gcp_billing_export_v1_XXXXXX`
WHERE
  service.description = 'Compute Engine'
  AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY cost_category
ORDER BY net_cost DESC
```

## Query 9: Cost by Region

Understand your geographic cost distribution:

```sql
-- Cost breakdown by region
SELECT
  IFNULL(location.region, 'global') AS region,
  ROUND(
    SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)),
    2
  ) AS net_cost,
  COUNT(DISTINCT service.description) AS service_count
FROM
  `my-project.billing.gcp_billing_export_v1_XXXXXX`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY region
HAVING net_cost > 0
ORDER BY net_cost DESC
```

## Query 10: Sustained Use Discount Effectiveness

See how much your Sustained Use Discounts are saving:

```sql
-- Sustained Use Discount savings analysis
SELECT
  FORMAT_TIMESTAMP('%Y-%m', usage_start_time) AS month,
  ROUND(SUM(cost), 2) AS gross_cost,
  ROUND(SUM(IFNULL(
    (SELECT SUM(c.amount) FROM UNNEST(credits) c
     WHERE c.name LIKE '%Sustained%'), 0
  )), 2) AS sud_credits,
  ROUND(SUM(IFNULL(
    (SELECT SUM(c.amount) FROM UNNEST(credits) c
     WHERE c.name LIKE '%Committed%'), 0
  )), 2) AS cud_credits,
  ROUND(SUM(IFNULL(
    (SELECT SUM(c.amount) FROM UNNEST(credits) c
     WHERE c.name NOT LIKE '%Sustained%'
     AND c.name NOT LIKE '%Committed%'), 0
  )), 2) AS other_credits
FROM
  `my-project.billing.gcp_billing_export_v1_XXXXXX`
WHERE
  service.description = 'Compute Engine'
GROUP BY month
ORDER BY month DESC
LIMIT 6
```

## Query 11: Forecasting Next Month Cost

Use a simple linear projection to estimate next month's spend:

```sql
-- Simple linear forecast for next month
WITH daily_costs AS (
  SELECT
    DATE(usage_start_time) AS date,
    SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS daily_cost
  FROM
    `my-project.billing.gcp_billing_export_v1_XXXXXX`
  WHERE
    usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  GROUP BY date
)
SELECT
  ROUND(AVG(daily_cost), 2) AS avg_daily_cost,
  ROUND(AVG(daily_cost) * 30, 2) AS projected_monthly_cost,
  ROUND(AVG(daily_cost) * 365, 2) AS projected_annual_cost,
  ROUND(MIN(daily_cost), 2) AS min_daily_cost,
  ROUND(MAX(daily_cost), 2) AS max_daily_cost
FROM daily_costs
```

## Saving These Queries

Rather than running these queries ad hoc, save them as views or scheduled queries:

```sql
-- Save as a view for easy access
CREATE OR REPLACE VIEW `my-project.billing.v_monthly_summary` AS
SELECT
  FORMAT_TIMESTAMP('%Y-%m', usage_start_time) AS month,
  project.name AS project_name,
  service.description AS service,
  ROUND(SUM(cost) + SUM(IFNULL(
    (SELECT SUM(c.amount) FROM UNNEST(credits) c), 0
  )), 2) AS net_cost
FROM
  `my-project.billing.gcp_billing_export_v1_XXXXXX`
GROUP BY month, project_name, service
```

## Best Practices for Billing Queries

1. **Always filter by time** - The billing table grows continuously. Filtering on `usage_start_time` prevents full table scans and keeps your query costs low.

2. **Account for credits** - Gross cost is not what you pay. Always include the credits calculation for accurate numbers.

3. **Handle NULL labels** - Not all resources have labels. Use IFNULL or COALESCE to handle missing label values.

4. **Partition your analysis** - Start broad (monthly by service) and drill down (daily by SKU) only when you find something interesting.

5. **Automate with scheduled queries** - Set up scheduled queries that run daily and populate summary tables. This makes dashboard building faster and cheaper.

## Wrapping Up

These queries give you a solid foundation for understanding your GCP spending. Start with the monthly summary and service breakdown to get the big picture, then use the anomaly detection and SKU-level queries to investigate specific cost drivers. As your analysis matures, save the most useful queries as views and connect them to Looker Studio for automated dashboards.
