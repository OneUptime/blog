# How to Analyze AWS Cost and Usage Reports with Athena

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Athena, CUR, Cost Analysis, SQL

Description: Learn how to query AWS Cost and Usage Reports with Athena using SQL to get deep insights into your cloud spending patterns and resource-level costs.

---

Cost and Usage Reports (CUR) contain every billable event in your AWS account, but those Parquet files sitting in S3 aren't useful by themselves. You need a way to query them. Athena lets you run SQL against your CUR data without setting up any infrastructure. No servers to manage, no data to load into a database - just write SQL and get answers.

This post walks through setting up Athena for CUR, then gives you a library of queries that answer real questions about your spending.

## Setting Up the Athena Table

If you configured CUR with the Athena integration artifact, AWS generates a CloudFormation template that creates the Glue database and table for you. It's in your S3 bucket.

```bash
# Find the CloudFormation template
aws s3 ls s3://my-company-cur-reports/cur/monthly-cur/ --recursive | grep cfn.yml

# Deploy it
aws cloudformation create-stack \
  --stack-name cur-athena-integration \
  --template-url https://my-company-cur-reports.s3.amazonaws.com/cur/monthly-cur/crawler-cfn.yml \
  --capabilities CAPABILITY_IAM
```

If you prefer to create the table manually, here's the SQL.

This creates the Athena table pointing to your CUR Parquet files.

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS cur_db.cost_and_usage (
  identity_line_item_id STRING,
  identity_time_interval STRING,
  bill_invoice_id STRING,
  bill_billing_entity STRING,
  bill_bill_type STRING,
  bill_payer_account_id STRING,
  bill_billing_period_start_date TIMESTAMP,
  bill_billing_period_end_date TIMESTAMP,
  line_item_usage_account_id STRING,
  line_item_line_item_type STRING,
  line_item_usage_start_date TIMESTAMP,
  line_item_usage_end_date TIMESTAMP,
  line_item_product_code STRING,
  line_item_usage_type STRING,
  line_item_operation STRING,
  line_item_availability_zone STRING,
  line_item_resource_id STRING,
  line_item_usage_amount DOUBLE,
  line_item_normalization_factor DOUBLE,
  line_item_normalized_usage_amount DOUBLE,
  line_item_currency_code STRING,
  line_item_unblended_rate STRING,
  line_item_unblended_cost DOUBLE,
  line_item_blended_rate STRING,
  line_item_blended_cost DOUBLE,
  line_item_line_item_description STRING,
  product_product_name STRING,
  product_region STRING,
  pricing_term STRING,
  pricing_unit STRING,
  reservation_reservation_a_r_n STRING,
  savings_plan_savings_plan_a_r_n STRING,
  resource_tags_user_environment STRING,
  resource_tags_user_team STRING,
  resource_tags_user_project STRING
)
STORED AS PARQUET
LOCATION 's3://my-company-cur-reports/cur/monthly-cur/'
TBLPROPERTIES ('parquet.compression'='SNAPPY');
```

## Query 1: Top 20 Most Expensive Resources

Find the individual resources costing you the most. This is where you find the idle databases, forgotten instances, and oversized volumes.

```sql
-- Top 20 most expensive individual resources this month
SELECT
  line_item_resource_id AS resource_id,
  line_item_product_code AS service,
  line_item_usage_type AS usage_type,
  product_region AS region,
  resource_tags_user_environment AS environment,
  resource_tags_user_team AS team,
  SUM(line_item_unblended_cost) AS total_cost
FROM cur_db.cost_and_usage
WHERE
  line_item_usage_start_date >= DATE '2026-02-01'
  AND line_item_resource_id != ''
  AND line_item_line_item_type = 'Usage'
GROUP BY 1, 2, 3, 4, 5, 6
ORDER BY total_cost DESC
LIMIT 20;
```

## Query 2: Daily Cost Trend by Service

Track how costs change day by day for each service.

```sql
-- Daily costs by service for the last 30 days
SELECT
  DATE(line_item_usage_start_date) AS usage_date,
  line_item_product_code AS service,
  SUM(line_item_unblended_cost) AS daily_cost
FROM cur_db.cost_and_usage
WHERE
  line_item_usage_start_date >= CURRENT_DATE - INTERVAL '30' DAY
  AND line_item_line_item_type IN ('Usage', 'DiscountedUsage')
GROUP BY 1, 2
HAVING SUM(line_item_unblended_cost) > 1.0
ORDER BY 1 DESC, 3 DESC;
```

## Query 3: Costs by Tag (Team Breakdown)

See how much each team is spending. This requires that you've activated the team tag as a cost allocation tag.

```sql
-- Monthly costs by team
SELECT
  COALESCE(resource_tags_user_team, 'Untagged') AS team,
  line_item_product_code AS service,
  SUM(line_item_unblended_cost) AS total_cost,
  ROUND(SUM(line_item_unblended_cost) / (
    SELECT SUM(line_item_unblended_cost)
    FROM cur_db.cost_and_usage
    WHERE line_item_usage_start_date >= DATE '2026-02-01'
  ) * 100, 2) AS pct_of_total
FROM cur_db.cost_and_usage
WHERE
  line_item_usage_start_date >= DATE '2026-02-01'
  AND line_item_line_item_type IN ('Usage', 'DiscountedUsage')
GROUP BY 1, 2
HAVING SUM(line_item_unblended_cost) > 10
ORDER BY team, total_cost DESC;
```

## Query 4: EC2 Instance Type Analysis

See which instance types you're running and how much each costs.

```sql
-- EC2 costs by instance type and pricing model
SELECT
  REGEXP_EXTRACT(line_item_usage_type, ':(.+)$', 1) AS instance_type,
  CASE
    WHEN savings_plan_savings_plan_a_r_n != '' THEN 'Savings Plan'
    WHEN reservation_reservation_a_r_n != '' THEN 'Reserved'
    WHEN line_item_usage_type LIKE '%Spot%' THEN 'Spot'
    ELSE 'On-Demand'
  END AS pricing_model,
  COUNT(DISTINCT line_item_resource_id) AS instance_count,
  SUM(line_item_usage_amount) AS total_hours,
  SUM(line_item_unblended_cost) AS total_cost,
  ROUND(SUM(line_item_unblended_cost) / NULLIF(SUM(line_item_usage_amount), 0), 4) AS cost_per_hour
FROM cur_db.cost_and_usage
WHERE
  line_item_product_code = 'AmazonEC2'
  AND line_item_usage_type LIKE '%BoxUsage%'
  AND line_item_usage_start_date >= DATE '2026-02-01'
GROUP BY 1, 2
ORDER BY total_cost DESC;
```

## Query 5: Data Transfer Cost Breakdown

Data transfer costs are notoriously hard to track. This query breaks them down by type.

```sql
-- Data transfer costs by type and region
SELECT
  line_item_usage_type AS transfer_type,
  product_region AS region,
  SUM(line_item_usage_amount) AS gb_transferred,
  SUM(line_item_unblended_cost) AS total_cost,
  ROUND(SUM(line_item_unblended_cost) / NULLIF(SUM(line_item_usage_amount), 0), 4) AS cost_per_gb
FROM cur_db.cost_and_usage
WHERE
  line_item_usage_start_date >= DATE '2026-02-01'
  AND (
    line_item_usage_type LIKE '%DataTransfer%'
    OR line_item_usage_type LIKE '%Bytes%'
    OR line_item_product_code = 'AWSDataTransfer'
  )
  AND line_item_unblended_cost > 0
GROUP BY 1, 2
ORDER BY total_cost DESC
LIMIT 30;
```

## Query 6: Untagged Resource Costs

Find how much you're spending on resources without proper tags. This helps drive tagging compliance.

```sql
-- Cost of untagged resources by service
SELECT
  line_item_product_code AS service,
  COUNT(DISTINCT line_item_resource_id) AS untagged_resources,
  SUM(line_item_unblended_cost) AS untagged_cost
FROM cur_db.cost_and_usage
WHERE
  line_item_usage_start_date >= DATE '2026-02-01'
  AND line_item_resource_id != ''
  AND (resource_tags_user_team IS NULL OR resource_tags_user_team = '')
  AND line_item_line_item_type = 'Usage'
  AND line_item_unblended_cost > 0
GROUP BY 1
HAVING SUM(line_item_unblended_cost) > 10
ORDER BY untagged_cost DESC;
```

## Query 7: Savings Plan and RI Savings

Calculate how much your reservations and Savings Plans are actually saving you.

```sql
-- Savings from Savings Plans and Reserved Instances
SELECT
  CASE
    WHEN savings_plan_savings_plan_a_r_n != '' THEN 'Savings Plan'
    WHEN reservation_reservation_a_r_n != '' THEN 'Reserved Instance'
    ELSE 'On-Demand'
  END AS pricing_model,
  SUM(line_item_unblended_cost) AS actual_cost,
  SUM(CASE
    WHEN line_item_line_item_type = 'SavingsPlanNegation' THEN -line_item_unblended_cost
    WHEN line_item_line_item_type = 'DiscountedUsage' THEN
      CAST(line_item_unblended_rate AS DOUBLE) * line_item_usage_amount - line_item_unblended_cost
    ELSE 0
  END) AS estimated_savings
FROM cur_db.cost_and_usage
WHERE
  line_item_usage_start_date >= DATE '2026-02-01'
  AND line_item_product_code = 'AmazonEC2'
GROUP BY 1
ORDER BY actual_cost DESC;
```

## Optimizing Athena Queries

CUR data can be large, and Athena charges $5 per TB scanned. Here are tips to keep costs down.

**Use date filters**: Always filter on `line_item_usage_start_date`. CUR data is partitioned by date, so this dramatically reduces the amount of data scanned.

**Use Parquet format**: If you haven't already, switch your CUR to Parquet. It's columnar, so Athena only reads the columns your query references.

**Create a partitioned table**: For large accounts, partition the Athena table by month.

```sql
-- Create a partitioned version of the table
CREATE TABLE cur_db.cost_and_usage_partitioned
WITH (
  format = 'PARQUET',
  external_location = 's3://my-company-cur-reports/cur-partitioned/',
  partitioned_by = ARRAY['billing_month']
)
AS SELECT
  *,
  DATE_FORMAT(line_item_usage_start_date, '%Y-%m') AS billing_month
FROM cur_db.cost_and_usage;
```

**Save commonly used queries as views** for reuse.

```sql
CREATE OR REPLACE VIEW cur_db.daily_service_costs AS
SELECT
  DATE(line_item_usage_start_date) AS usage_date,
  line_item_product_code AS service,
  SUM(line_item_unblended_cost) AS daily_cost
FROM cur_db.cost_and_usage
WHERE line_item_line_item_type IN ('Usage', 'DiscountedUsage')
GROUP BY 1, 2;
```

For visualizing these insights in dashboards, see our guide on [visualizing AWS costs with QuickSight](https://oneuptime.com/blog/post/visualize-aws-costs-quicksight/view).

## Wrapping Up

Athena turns CUR data from a pile of Parquet files into a powerful cost analysis tool. The queries in this post cover the most common cost analysis scenarios - from finding your most expensive resources to tracking data transfer costs and measuring reservation savings. Start with the top resources query, identify the biggest opportunities, and build from there. Save your most useful queries as views for easy reuse, and always filter on date ranges to keep Athena costs low.
