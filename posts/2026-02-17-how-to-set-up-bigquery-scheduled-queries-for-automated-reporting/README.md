# How to Set Up BigQuery Scheduled Queries for Automated Reporting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Scheduled Queries, Automation, Reporting

Description: Learn how to set up BigQuery scheduled queries to automate your reporting pipelines, including configuration options, error handling, and best practices.

---

Running the same report query every morning before standup gets old fast. BigQuery scheduled queries let you automate recurring SQL jobs so they run on a fixed schedule without any manual intervention. Whether it is a daily sales summary, a weekly metrics rollup, or an hourly data transformation, scheduled queries handle it.

I have been using scheduled queries for years now, and they are surprisingly capable for how simple they are to set up. Let me walk through the full process.

## What Are BigQuery Scheduled Queries?

Scheduled queries are part of the BigQuery Data Transfer Service. You write a standard SQL query, define a schedule (like "every day at 6 AM"), and BigQuery runs it automatically. The results can be written to a destination table, appended to an existing table, or used as a DML/DDL statement.

They support:
- Standard SQL queries, including DML (INSERT, UPDATE, DELETE, MERGE)
- DDL statements (CREATE TABLE, etc.)
- Parameterized date references using `@run_time` and `@run_date`
- Email notifications on success or failure

## Creating a Scheduled Query via the Console

The quickest way to set up a scheduled query is through the BigQuery console. But since we are developers, let me show you both the console approach and the programmatic approach.

Here is the SQL for a daily revenue summary that we want to schedule.

```sql
-- Daily revenue summary query
-- Uses @run_date parameter to process only yesterday's data
SELECT
  DATE_SUB(@run_date, INTERVAL 1 DAY) AS report_date,
  region,
  product_category,
  COUNT(DISTINCT order_id) AS total_orders,
  SUM(amount) AS total_revenue,
  AVG(amount) AS avg_order_value
FROM `my_project.my_dataset.orders`
WHERE order_date = DATE_SUB(@run_date, INTERVAL 1 DAY)
GROUP BY report_date, region, product_category;
```

The `@run_date` parameter is automatically set to the scheduled execution date. Using `DATE_SUB(@run_date, INTERVAL 1 DAY)` means the query processes yesterday's data.

## Creating a Scheduled Query with bq CLI

You can create scheduled queries using the `bq` command-line tool.

```bash
# Create a scheduled query that runs daily at 6 AM UTC
# Results are written to the daily_revenue_summary table
bq mk --transfer_config \
  --project_id=my_project \
  --data_source=scheduled_query \
  --target_dataset=my_dataset \
  --display_name="Daily Revenue Summary" \
  --schedule="every day 06:00" \
  --params='{
    "query": "SELECT DATE_SUB(@run_date, INTERVAL 1 DAY) AS report_date, region, product_category, COUNT(DISTINCT order_id) AS total_orders, SUM(amount) AS total_revenue FROM `my_project.my_dataset.orders` WHERE order_date = DATE_SUB(@run_date, INTERVAL 1 DAY) GROUP BY 1, 2, 3",
    "destination_table_name_template": "daily_revenue_summary",
    "write_disposition": "WRITE_APPEND"
  }'
```

## Creating a Scheduled Query with Terraform

For infrastructure-as-code setups, Terraform is the way to go.

```hcl
# Terraform resource for a BigQuery scheduled query
resource "google_bigquery_data_transfer_config" "daily_revenue" {
  display_name           = "Daily Revenue Summary"
  location               = "US"
  data_source_id         = "scheduled_query"
  schedule               = "every day 06:00"
  destination_dataset_id = google_bigquery_dataset.reporting.dataset_id

  params = {
    destination_table_name_template = "daily_revenue_summary"
    write_disposition               = "WRITE_APPEND"
    query                           = <<-EOT
      SELECT
        DATE_SUB(@run_date, INTERVAL 1 DAY) AS report_date,
        region,
        product_category,
        COUNT(DISTINCT order_id) AS total_orders,
        SUM(amount) AS total_revenue
      FROM `my_project.my_dataset.orders`
      WHERE order_date = DATE_SUB(@run_date, INTERVAL 1 DAY)
      GROUP BY 1, 2, 3
    EOT
  }
}
```

## Schedule Syntax

BigQuery uses a custom schedule syntax. Here are the most common patterns.

```
every day 06:00              -- Daily at 6 AM UTC
every day 14:30              -- Daily at 2:30 PM UTC
every monday 09:00           -- Weekly on Mondays
every 1 hours                -- Every hour
every 15 minutes             -- Every 15 minutes
1,15 of month 08:00          -- 1st and 15th of each month at 8 AM
every 6 hours from 00:00     -- Every 6 hours starting at midnight
```

You can also specify a time zone when creating the scheduled query so the schedule follows local time instead of UTC.

## Using Run-Time Parameters

Scheduled queries support two built-in parameters.

```sql
-- @run_time: TIMESTAMP of the scheduled execution time
-- @run_date: DATE of the scheduled execution date

-- Example: Process data for the previous hour
SELECT
  event_type,
  COUNT(*) AS event_count
FROM `my_project.my_dataset.events`
WHERE event_timestamp >= TIMESTAMP_SUB(@run_time, INTERVAL 1 HOUR)
  AND event_timestamp < @run_time
GROUP BY event_type;
```

These parameters let you build incremental processing pipelines where each run processes only the data since the last run.

## Write Disposition Options

You have three options for how results are written to the destination table.

**WRITE_TRUNCATE**: Replaces the entire destination table with the query results. Good for tables that should always reflect the latest state.

```sql
-- With WRITE_TRUNCATE, this replaces the entire summary table each run
-- Good for "current state" tables
SELECT
  region,
  COUNT(*) AS active_users
FROM `my_project.my_dataset.users`
WHERE last_active_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY region;
```

**WRITE_APPEND**: Appends results to the existing table. Good for accumulating historical data.

**WRITE_EMPTY**: Only writes if the destination table is empty. Rarely used for scheduled queries.

## DML-Based Scheduled Queries

Scheduled queries are not limited to SELECT statements. You can run DML operations like MERGE, which is great for maintaining slowly changing dimension tables.

```sql
-- Scheduled MERGE to update a customer summary table
-- Runs daily to incorporate new orders
MERGE `my_project.my_dataset.customer_summary` AS target
USING (
  SELECT
    customer_id,
    COUNT(*) AS order_count,
    SUM(amount) AS total_spent,
    MAX(order_date) AS last_order_date
  FROM `my_project.my_dataset.orders`
  WHERE order_date = DATE_SUB(@run_date, INTERVAL 1 DAY)
  GROUP BY customer_id
) AS source
ON target.customer_id = source.customer_id
WHEN MATCHED THEN
  UPDATE SET
    order_count = target.order_count + source.order_count,
    total_spent = target.total_spent + source.total_spent,
    last_order_date = source.last_order_date
WHEN NOT MATCHED THEN
  INSERT (customer_id, order_count, total_spent, last_order_date)
  VALUES (source.customer_id, source.order_count, source.total_spent, source.last_order_date);
```

For DML queries, you do not specify a destination table - the target table is defined in the SQL itself.

## Setting Up Notifications

You can configure email notifications for when scheduled queries succeed or fail. This is configured in the BigQuery console under the scheduled query's settings, or via the API.

```bash
# Update a scheduled query to send notifications on failure
bq update --transfer_config \
  --transfer_config_id=projects/my_project/locations/us/transferConfigs/abc123 \
  --notification_pubsub_topic=projects/my_project/topics/scheduled-query-alerts
```

For more sophisticated alerting, publish notifications to a Pub/Sub topic and process them with Cloud Functions.

## Monitoring Scheduled Query Runs

Check the status of your scheduled query runs using INFORMATION_SCHEMA or the bq CLI.

```bash
# List recent runs for a scheduled query
bq ls --transfer_run \
  --project_id=my_project \
  --transfer_location=us \
  projects/my_project/locations/us/transferConfigs/abc123
```

You can also query the transfer run history programmatically.

```sql
-- Check for failed scheduled query runs in the last 7 days
SELECT
  run_time,
  state,
  error_status
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE job_type = 'QUERY'
  AND creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND error_result IS NOT NULL
ORDER BY creation_time DESC;
```

## Best Practices

1. **Always test your query manually first**: Run the query with a specific date substituted for `@run_date` to verify it works.

2. **Use partition filters**: If your source tables are partitioned, make sure your scheduled query includes partition filters to keep costs down.

3. **Set up failure notifications**: You want to know immediately when a scheduled query fails, not discover it days later when someone asks about missing data.

4. **Use MERGE instead of TRUNCATE and RELOAD**: For incremental updates, MERGE is more efficient and handles edge cases like late-arriving data.

5. **Keep idempotency in mind**: Scheduled queries can be re-run (backfilled). Design your queries so running them twice for the same date does not create duplicates.

## Wrapping Up

BigQuery scheduled queries are a lightweight way to automate your reporting and data transformation pipelines. They do not require any external infrastructure - no Airflow, no Cloud Composer, no cron jobs. For straightforward daily or hourly SQL jobs, they are hard to beat.

For more complex pipeline monitoring and alerting beyond what BigQuery provides natively, [OneUptime](https://oneuptime.com) can help you track the health and reliability of your entire data pipeline.
