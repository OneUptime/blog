# How to Export GCP Billing Data to BigQuery for Cost Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Billing Export, BigQuery, Cost Analysis, Google Cloud

Description: Step-by-step instructions for exporting Google Cloud billing data to BigQuery and writing queries to analyze your cloud spending patterns.

---

The billing section in the Google Cloud Console gives you a decent overview of your spending, but it falls short when you need to dig deeper. If you want to know which team spent the most last quarter, how your costs trend week over week, or exactly which SKUs are driving your Compute Engine bill, you need your billing data in BigQuery. Once it is there, you can slice and dice it with SQL, build dashboards, and set up automated reports.

This guide walks through setting up the billing export, understanding the schema, and writing useful queries.

## Why Export Billing Data to BigQuery?

The Cloud Console billing reports are fine for a quick glance, but they have limitations:

- You cannot join billing data with other datasets (like team ownership tables)
- Custom aggregations are limited
- Historical data retention is capped
- You cannot build automated reports or alerts based on granular cost data

BigQuery billing export solves all of these problems. Every line item from your bill lands in a BigQuery table, updated multiple times per day, and you can query it with standard SQL.

## Step 1: Create a BigQuery Dataset

First, create a dataset to hold the billing data. I recommend putting it in a dedicated billing or finance project:

```bash
# Create a dataset for billing data
bq mk --dataset \
  --location=US \
  --description="GCP billing export data" \
  my-billing-project:gcp_billing_export
```

Make sure the dataset location matches where you want to run your queries. US or EU multi-region are common choices.

## Step 2: Enable Billing Export

You need Billing Account Administrator permissions for this step.

### Using the Cloud Console

1. Go to Billing in the Cloud Console
2. Select your billing account
3. Click "Billing export" in the left sidebar
4. You will see three export options:
   - **Standard usage cost**: Daily cost data (free)
   - **Detailed usage cost**: Includes resource-level details (free)
   - **Pricing**: Export pricing data
5. For each export you want, click "Edit Settings"
6. Select your project and dataset
7. Click "Save"

### Using the gcloud CLI

```bash
# Enable standard billing export to BigQuery
gcloud billing accounts describe BILLING_ACCOUNT_ID \
  --format="value(name)"

# Note: Billing export setup is primarily done through the Console
# But you can verify the configuration via the API
gcloud beta billing accounts get-iam-policy BILLING_ACCOUNT_ID
```

## Step 3: Wait for Data to Populate

After enabling the export, it takes a few hours for data to start appearing. The export is not retroactive by default - you will only get data from the point of enablement forward. However, Google does backfill up to about 30-45 days of historical data for standard exports.

You can check if data has arrived:

```bash
# Check if billing data has been exported
bq query --use_legacy_sql=false \
  'SELECT COUNT(*) as row_count,
   MIN(usage_start_time) as earliest_date,
   MAX(usage_start_time) as latest_date
   FROM `my-billing-project.gcp_billing_export.gcp_billing_export_v1_XXXXXX`'
```

The table name includes your billing account ID. Check the dataset to find the exact table name:

```bash
# List tables in the billing dataset
bq ls my-billing-project:gcp_billing_export
```

## Understanding the Schema

The billing export table has a rich schema. Here are the key columns:

- **billing_account_id**: The billing account this charge belongs to
- **project.id** and **project.name**: The GCP project
- **service.description**: The GCP service (e.g., "Compute Engine", "Cloud Storage")
- **sku.description**: The specific SKU (e.g., "N2 Instance Core running in Americas")
- **usage_start_time** and **usage_end_time**: When the usage occurred
- **cost**: The cost in the billing currency
- **credits**: Any credits applied (sustained use discounts, CUDs, free tier, etc.)
- **labels**: Key-value labels attached to the resource
- **location.region**: Where the resource is located

## Step 4: Write Useful Queries

Here are queries I find myself running regularly.

### Monthly Cost by Service

```sql
-- Monthly cost breakdown by GCP service
SELECT
  FORMAT_TIMESTAMP('%Y-%m', usage_start_time) AS month,
  service.description AS service,
  ROUND(SUM(cost), 2) AS gross_cost,
  ROUND(SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS credits,
  ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS net_cost
FROM
  `my-billing-project.gcp_billing_export.gcp_billing_export_v1_XXXXXX`
WHERE
  usage_start_time >= TIMESTAMP('2026-01-01')
GROUP BY
  month, service
ORDER BY
  month DESC, net_cost DESC
```

### Cost by Project

```sql
-- Monthly cost by project, showing which projects cost the most
SELECT
  project.name AS project_name,
  FORMAT_TIMESTAMP('%Y-%m', usage_start_time) AS month,
  ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS net_cost
FROM
  `my-billing-project.gcp_billing_export.gcp_billing_export_v1_XXXXXX`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
GROUP BY
  project_name, month
ORDER BY
  net_cost DESC
```

### Daily Cost Trend

```sql
-- Daily cost trend for the past 30 days
SELECT
  DATE(usage_start_time) AS date,
  ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS net_cost
FROM
  `my-billing-project.gcp_billing_export.gcp_billing_export_v1_XXXXXX`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  date
ORDER BY
  date
```

### Cost by Label

```sql
-- Cost breakdown by a custom label (e.g., team)
SELECT
  (SELECT value FROM UNNEST(labels) WHERE key = 'team') AS team,
  service.description AS service,
  ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS net_cost
FROM
  `my-billing-project.gcp_billing_export.gcp_billing_export_v1_XXXXXX`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  team, service
HAVING
  net_cost > 1
ORDER BY
  net_cost DESC
```

### Top Expensive SKUs

```sql
-- Find the most expensive SKUs to identify cost drivers
SELECT
  service.description AS service,
  sku.description AS sku,
  ROUND(SUM(cost), 2) AS total_cost,
  ROUND(SUM(usage.amount_in_pricing_units), 2) AS total_usage,
  usage.pricing_unit
FROM
  `my-billing-project.gcp_billing_export.gcp_billing_export_v1_XXXXXX`
WHERE
  usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  service, sku, pricing_unit
HAVING
  total_cost > 10
ORDER BY
  total_cost DESC
LIMIT 20
```

## Step 5: Create Scheduled Queries

Set up scheduled queries to generate regular reports:

```bash
# Create a scheduled query that runs daily and saves results to a table
bq query --use_legacy_sql=false \
  --destination_table=my-billing-project:gcp_billing_export.daily_cost_summary \
  --replace \
  --schedule='every 24 hours' \
  --display_name='Daily Cost Summary' \
  'SELECT
    DATE(usage_start_time) AS date,
    project.name AS project_name,
    service.description AS service,
    ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS net_cost
  FROM
    `my-billing-project.gcp_billing_export.gcp_billing_export_v1_XXXXXX`
  WHERE
    usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
  GROUP BY
    date, project_name, service'
```

## Step 6: Set Up Alerts on Cost Anomalies

Use BigQuery with Cloud Monitoring or Cloud Functions to detect cost spikes:

```sql
-- Detect daily cost anomalies (days where cost is 50% above the 7-day average)
WITH daily_costs AS (
  SELECT
    DATE(usage_start_time) AS date,
    SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS daily_cost
  FROM
    `my-billing-project.gcp_billing_export.gcp_billing_export_v1_XXXXXX`
  WHERE
    usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)
  GROUP BY date
),
averages AS (
  SELECT
    date,
    daily_cost,
    AVG(daily_cost) OVER (
      ORDER BY date
      ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
    ) AS avg_7_day
  FROM daily_costs
)
SELECT
  date,
  ROUND(daily_cost, 2) AS daily_cost,
  ROUND(avg_7_day, 2) AS avg_7_day,
  ROUND((daily_cost - avg_7_day) / avg_7_day * 100, 1) AS pct_above_avg
FROM averages
WHERE daily_cost > avg_7_day * 1.5
ORDER BY date DESC
```

## Best Practices

1. **Enable both standard and detailed exports** - Standard is good for high-level analysis. Detailed gives you resource-level data that helps with specific optimizations.

2. **Partition your queries by time** - Always filter on `usage_start_time` to avoid scanning the entire table. This keeps your analysis queries cheap.

3. **Create views for common reports** - Wrap your most-used queries in views so team members can use them without writing SQL.

4. **Export to Looker Studio** - Connect BigQuery to Looker Studio (formerly Data Studio) for visual dashboards that update automatically.

5. **Keep billing data long-term** - Set a generous retention policy on the billing dataset. Year-over-year comparisons are invaluable for planning.

## Wrapping Up

Exporting billing data to BigQuery transforms cost management from guesswork into data-driven decision making. The setup takes about 15 minutes, and once the data starts flowing, you have the power of SQL and BigQuery's speed at your disposal. Start with the basic queries in this guide, then build your own based on what questions your team needs answered.
