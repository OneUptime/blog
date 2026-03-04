# How to Control BigQuery Costs with Custom Daily Query Quotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Cost Control, Quotas, Google Cloud

Description: Learn how to set up custom daily query quotas in BigQuery to prevent runaway costs from expensive queries and keep your data analytics spending predictable.

---

BigQuery is one of those services that can go from "this is amazing" to "this is terrifyingly expensive" in a single query. Its on-demand pricing model charges based on the amount of data scanned, and a careless SELECT * on a multi-terabyte table can cost hundreds of dollars in seconds. Custom daily query quotas give you a safety net by capping how much data your users and projects can scan per day.

This post covers how to set up these quotas, when to use them, and how to combine them with other cost control strategies.

## Understanding BigQuery Pricing

Before diving into quotas, let us understand what drives BigQuery costs. On-demand pricing charges $6.25 per TB of data scanned (as of early 2026). The first 1 TB per month is free, but that goes fast in any real analytics environment.

The problem is that BigQuery is so fast that people tend to run queries without thinking about cost. A data analyst exploring a dataset might run dozens of queries in an afternoon, each scanning hundreds of gigabytes.

## What Are Custom Quotas?

BigQuery lets you set custom quotas that limit the amount of data scanned per day. You can set quotas at two levels:

- **Project-level**: Limits total data scanned across all users in the project
- **User-level**: Limits data scanned per individual user

When a user or project hits their quota, subsequent queries are rejected until the next day (quotas reset at midnight Pacific Time).

## Setting Up Project-Level Quotas

### Using the Cloud Console

1. Go to the Google Cloud Console
2. Navigate to IAM & Admin then Quotas
3. Filter for "BigQuery API" and look for "Query usage per day"
4. Click on the quota and then click "Edit Quotas"
5. Enter your desired limit in bytes

### Using the gcloud CLI

Unfortunately, BigQuery quotas need to be managed through the Cloud Console or the Service Usage API. Here is how to do it with the API:

```bash
# Check current BigQuery quotas for your project
gcloud services quotas list \
  --service=bigquery.googleapis.com \
  --consumer=projects/my-project \
  --format="table(metric, unit, values)"
```

To request a quota change programmatically, you can use the serviceusage API:

```python
# Script to set BigQuery daily query quota using the API
from google.cloud import service_usage_v1

def set_bigquery_quota(project_id, quota_value_tb):
    """Set the daily BigQuery query quota in TB."""
    client = service_usage_v1.ServiceUsageClient()

    # Convert TB to bytes for the quota value
    quota_bytes = int(quota_value_tb * 1024 * 1024 * 1024 * 1024)

    print(f"Setting BigQuery daily quota to {quota_value_tb} TB")
    print(f"({quota_bytes} bytes) for project {project_id}")

    # Note: Quota changes are typically done through the Console
    # or by submitting a quota change request
    # This is shown for illustration of the concept

set_bigquery_quota("my-project", 5)  # 5 TB per day
```

## Setting Up User-Level Quotas

User-level quotas are more granular and prevent any single user from consuming the entire project quota. You can set these through BigQuery's own settings.

In your BigQuery project settings, you can configure:

```sql
-- Check current user-level usage (run in BigQuery)
-- This query shows how much each user has scanned today
SELECT
  user_email,
  SUM(total_bytes_processed) AS bytes_scanned_today,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4), 2) AS tb_scanned_today,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4) * 6.25, 2) AS estimated_cost_today
FROM
  `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE
  creation_time >= TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY
  user_email
ORDER BY
  bytes_scanned_today DESC
```

## Choosing the Right Quota Values

Setting quotas too low frustrates users. Setting them too high defeats the purpose. Here is a methodology for finding the right balance:

### Step 1: Analyze Historical Usage

Query your INFORMATION_SCHEMA to understand your current usage patterns:

```sql
-- Analyze daily query volume over the past 30 days
SELECT
  DATE(creation_time) AS query_date,
  COUNT(*) AS query_count,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4), 2) AS tb_scanned,
  ROUND(SUM(total_bytes_processed) / POW(1024, 4) * 6.25, 2) AS estimated_cost
FROM
  `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE
  creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY
  query_date
ORDER BY
  query_date DESC
```

### Step 2: Set Quotas Based on Percentiles

Look at your p90 daily usage and add a 20-30% buffer. This catches outlier days without blocking normal work.

### Step 3: Set Different Quotas for Different Environments

Production analytics projects might need higher quotas than development or sandbox projects. Consider creating separate projects with different quota levels:

- **Production analytics**: 10 TB/day project quota, 2 TB/day per user
- **Development/sandbox**: 1 TB/day project quota, 500 GB/day per user
- **Automated pipelines**: Separate project with appropriate quotas for ETL jobs

## Alternative Cost Controls

Quotas are one tool in your arsenal. Here are others that work well alongside them.

### Maximum Bytes Billed Per Query

You can set a maximum bytes limit on individual queries. If a query would scan more than the limit, it fails before running:

```sql
-- This query will fail if it would scan more than 1 GB
-- Set in query settings or via the API
#standardSQL
-- @maximum_bytes_billed: 1073741824
SELECT *
FROM `my-project.my_dataset.large_table`
WHERE date_column = '2026-01-15'
```

In the gcloud CLI or client libraries:

```python
# Set maximum bytes billed per query in Python
from google.cloud import bigquery

client = bigquery.Client()

# Configure job to fail if it would scan more than 10 GB
job_config = bigquery.QueryJobConfig(
    maximum_bytes_billed=10 * 1024 * 1024 * 1024  # 10 GB
)

query = """
SELECT user_id, event_type, COUNT(*) as event_count
FROM `my-project.analytics.events`
WHERE event_date = '2026-01-15'
GROUP BY user_id, event_type
"""

# This will raise an error if the query would scan more than 10 GB
try:
    results = client.query(query, job_config=job_config).result()
    for row in results:
        print(row)
except Exception as e:
    print(f"Query exceeded bytes limit: {e}")
```

### Dry Run Queries

Before running expensive queries, use dry run to estimate the cost:

```bash
# Estimate query cost without running it
bq query --dry_run --use_legacy_sql=false \
  'SELECT * FROM `my-project.my_dataset.large_table`'
```

This returns the number of bytes that would be scanned, so you can calculate the cost before committing.

### Partitioned and Clustered Tables

The best way to control BigQuery costs is to scan less data in the first place:

```sql
-- Create a partitioned and clustered table to reduce scan costs
CREATE TABLE `my-project.my_dataset.events_optimized`
PARTITION BY DATE(event_timestamp)
CLUSTER BY user_id, event_type
AS
SELECT * FROM `my-project.my_dataset.events`;
```

Partitioning ensures queries that filter on the partition column only scan relevant partitions. Clustering sorts data within partitions so that filters on clustered columns skip irrelevant blocks.

### Flat-Rate Pricing

If your usage is consistently high, consider switching to flat-rate (now called BigQuery Editions) pricing. Instead of paying per TB scanned, you pay for a fixed amount of compute capacity (slots). This makes costs predictable regardless of query volume.

```bash
# Purchase BigQuery Editions capacity commitment
bq mk --capacity_commitment \
  --project_id=my-project \
  --location=us \
  --plan=ANNUAL \
  --edition=STANDARD \
  --slots=500
```

## Setting Up Alerts for Query Spending

Combine quotas with monitoring alerts to get early warnings:

```bash
# Create an alert policy for BigQuery query costs
gcloud alpha monitoring policies create \
  --display-name="BigQuery Daily Spending Alert" \
  --condition-display-name="BQ query bytes exceed threshold" \
  --condition-filter='resource.type="bigquery_project" AND metric.type="bigquery.googleapis.com/query/scanned_bytes"' \
  --condition-threshold-value=5497558138880 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-aggregations-alignment-period=86400s \
  --condition-aggregations-per-series-aligner=ALIGN_SUM
```

## Best Practices

1. **Start with monitoring, then add quotas** - Understand your usage patterns before setting limits that might disrupt work.

2. **Communicate quotas to your team** - Nobody likes hitting a wall they did not know existed. Publish the quota values and educate users on efficient querying.

3. **Use project separation** - Different use cases deserve different projects with different quotas. Do not mix ETL pipelines with ad-hoc analytics in the same project.

4. **Review and adjust quarterly** - As your data and team grow, revisit quota values to keep them aligned with actual needs.

5. **Combine with table-level controls** - Partition tables, use authorized views to restrict access, and set maximum bytes billed on automated queries.

## Wrapping Up

Custom daily query quotas are an essential guardrail for any team using BigQuery on-demand pricing. They prevent the accidental queries that can blow through budgets in minutes. Combined with maximum bytes billed, partitioned tables, and usage monitoring, you get a layered cost control system that keeps spending predictable without killing productivity.
