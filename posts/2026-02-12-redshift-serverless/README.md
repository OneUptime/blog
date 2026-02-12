# How to Use Redshift Serverless

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, Serverless, Data Warehouse, Analytics

Description: A practical guide to Amazon Redshift Serverless, covering workspace setup, namespace configuration, data loading, query patterns, and cost management strategies.

---

Provisioned Redshift clusters are great when you know your workload, but they come with decisions: how many nodes, what instance type, when to resize. Redshift Serverless removes all of that. You create a workspace, run queries, and AWS handles the compute scaling. You pay for the compute time your queries actually use, measured in Redshift Processing Units (RPUs).

If you're running ad-hoc analytics, building a proof of concept, or dealing with workloads that spike unpredictably, Serverless is the simpler path. Let's set it up.

## Core Concepts

Redshift Serverless has two key components:

- **Namespace** - your databases, schemas, tables, and users. Think of it as the data layer. A namespace persists even when no compute is running.
- **Workgroup** - the compute layer that processes your queries. It scales up and down automatically based on demand.

You can have multiple workgroups sharing the same namespace, which is useful for separating workloads (like ETL vs. dashboards) with different capacity limits.

## Creating a Namespace and Workgroup

```bash
# Create a namespace - this is where your data lives
aws redshift-serverless create-namespace \
  --namespace-name analytics-ns \
  --db-name warehouse \
  --admin-username admin \
  --admin-user-password 'SecurePassword123!' \
  --iam-roles "arn:aws:iam::123456789:role/RedshiftS3Access" \
  --default-iam-role-arn "arn:aws:iam::123456789:role/RedshiftS3Access"
```

```bash
# Create a workgroup - this is the compute layer
aws redshift-serverless create-workgroup \
  --workgroup-name analytics-wg \
  --namespace-name analytics-ns \
  --base-capacity 32 \
  --security-group-ids sg-12345678 \
  --subnet-ids subnet-abc123 subnet-def456 \
  --publicly-accessible
```

The `base-capacity` is measured in RPUs. The minimum is 8, and Serverless can scale up from there automatically. Start with 32 for most workloads and adjust based on what you see.

## Connecting to Redshift Serverless

The connection works the same as provisioned Redshift - it's PostgreSQL-compatible.

```bash
# Get the endpoint for your workgroup
aws redshift-serverless get-workgroup \
  --workgroup-name analytics-wg \
  --query 'workgroup.endpoint.address'
```

Connect using any PostgreSQL client.

```bash
# Connect with psql
psql -h analytics-wg.123456789.us-east-1.redshift-serverless.amazonaws.com \
  -p 5439 -U admin -d warehouse
```

Python connection:

```python
# Connect to Redshift Serverless from Python
import redshift_connector

conn = redshift_connector.connect(
    host='analytics-wg.123456789.us-east-1.redshift-serverless.amazonaws.com',
    port=5439,
    database='warehouse',
    user='admin',
    password='SecurePassword123!'
)

cursor = conn.cursor()
cursor.execute("SELECT current_user, current_database()")
print(cursor.fetchone())
```

## Creating Tables and Loading Data

The SQL is identical to provisioned Redshift. All the same distribution styles, sort keys, and COPY commands work.

```sql
-- Create a table with the same syntax as provisioned Redshift
CREATE TABLE sales (
    sale_id BIGINT IDENTITY(1,1),
    product_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    sale_date DATE NOT NULL,
    quantity INT,
    revenue DECIMAL(12,2),
    region VARCHAR(50)
)
DISTSTYLE KEY
DISTKEY (customer_id)
SORTKEY (sale_date);

-- Load data from S3 - same COPY command
COPY sales
FROM 's3://my-data-bucket/sales/'
IAM_ROLE DEFAULT
CSV
IGNOREHEADER 1
GZIP;
```

The `IAM_ROLE DEFAULT` uses the default role you specified when creating the namespace. This is a convenient shorthand.

## Configuring Capacity Limits

One of the best features of Serverless is that you can set capacity limits to control costs.

```bash
# Set maximum RPU capacity for the workgroup
aws redshift-serverless update-workgroup \
  --workgroup-name analytics-wg \
  --base-capacity 64 \
  --max-capacity 256
```

You can also set usage limits to cap costs over time.

```bash
# Create a usage limit - cap compute at 1000 RPU-hours per day
aws redshift-serverless create-usage-limit \
  --resource-arn arn:aws:redshift-serverless:us-east-1:123456789:workgroup/analytics-wg \
  --usage-type serverless-compute \
  --amount 1000 \
  --period daily \
  --breach-action deactivate
```

The `breach-action` can be `log` (just log a warning), `emit-metric` (publish to CloudWatch), or `deactivate` (stop the workgroup). For production, start with `emit-metric` and set up alarms before using `deactivate`.

## Scheduling Queries

Redshift Serverless supports scheduled queries, which are useful for ETL jobs and report generation.

```sql
-- Create a scheduled query that refreshes a summary table every hour
CREATE SCHEDULE hourly_refresh
  EVERY 1 HOUR
  AS
  $$
    -- Truncate and reload the summary table
    TRUNCATE TABLE sales_daily_summary;

    INSERT INTO sales_daily_summary
    SELECT sale_date,
           region,
           COUNT(*) AS transaction_count,
           SUM(revenue) AS total_revenue,
           AVG(revenue) AS avg_order_value
    FROM sales
    WHERE sale_date >= DATEADD(day, -30, CURRENT_DATE)
    GROUP BY sale_date, region;
  $$;
```

## Sharing Data Between Workgroups

You can create multiple workgroups against the same namespace to isolate workloads.

```bash
# Create a second workgroup for ETL with higher capacity
aws redshift-serverless create-workgroup \
  --workgroup-name etl-wg \
  --namespace-name analytics-ns \
  --base-capacity 128

# Create a third workgroup for dashboards with lower capacity
aws redshift-serverless create-workgroup \
  --workgroup-name dashboard-wg \
  --namespace-name analytics-ns \
  --base-capacity 16
```

This way, heavy ETL jobs don't slow down dashboard queries. Each workgroup has its own compute budget.

## Snapshots and Recovery

Serverless creates automatic recovery points, but you can also take manual snapshots.

```bash
# Create a manual snapshot
aws redshift-serverless create-snapshot \
  --namespace-name analytics-ns \
  --snapshot-name before-migration-2026-02-12 \
  --retention-period 30

# List available snapshots
aws redshift-serverless list-snapshots \
  --namespace-name analytics-ns

# Restore from a snapshot to a new namespace
aws redshift-serverless restore-from-snapshot \
  --namespace-name analytics-ns-restored \
  --snapshot-name before-migration-2026-02-12 \
  --workgroup-name restored-wg \
  --admin-user-password 'NewPassword123!'
```

## Monitoring and Cost Tracking

Track your Serverless costs with CloudWatch and the built-in system views.

```sql
-- Check recent query execution details
SELECT query_id, query_text, elapsed_time, queue_time,
       execution_time, compute_units
FROM sys_query_history
WHERE start_time > DATEADD(hour, -1, GETDATE())
ORDER BY elapsed_time DESC
LIMIT 20;

-- See compute usage over time
SELECT DATE_TRUNC('hour', start_time) AS hour,
       SUM(compute_units) AS total_rpus,
       COUNT(*) AS query_count
FROM sys_query_history
WHERE start_time > DATEADD(day, -7, GETDATE())
GROUP BY DATE_TRUNC('hour', start_time)
ORDER BY hour;
```

Set up CloudWatch alarms to catch cost surprises.

```bash
# Alert when compute usage exceeds threshold
aws cloudwatch put-metric-alarm \
  --alarm-name redshift-serverless-high-compute \
  --namespace AWS/Redshift-Serverless \
  --metric-name ComputeSeconds \
  --statistic Sum \
  --period 3600 \
  --threshold 10000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=Workgroup,Value=analytics-wg \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

## When Serverless Saves Money (And When It Doesn't)

Serverless wins when your workload is bursty or unpredictable. If you run heavy queries for 4 hours a day and nothing the other 20, you'll pay for 4 hours instead of 24. That's a huge savings over provisioned.

But if your cluster is busy 18+ hours a day, provisioned clusters with reserved instances are cheaper. Do the math for your specific workload.

Here's a rough comparison:

- **Light usage** (< 6 hours/day of queries): Serverless is cheaper
- **Moderate usage** (6-14 hours/day): Could go either way, test both
- **Heavy usage** (14+ hours/day): Provisioned with reserved instances wins

## Migrating from Provisioned to Serverless

If you have an existing provisioned cluster, you can migrate using a snapshot.

```bash
# Take a snapshot of your provisioned cluster
aws redshift create-cluster-snapshot \
  --snapshot-identifier migrate-to-serverless \
  --cluster-identifier my-provisioned-cluster

# Restore the snapshot into a Serverless namespace
aws redshift-serverless restore-from-snapshot \
  --namespace-name migrated-ns \
  --snapshot-name migrate-to-serverless \
  --workgroup-name migrated-wg \
  --admin-user-password 'Password123!'
```

All your data, tables, users, and schemas come along for the ride.

## Wrapping Up

Redshift Serverless is the easiest way to get started with Redshift. No capacity planning, no node selection, no resize operations. You trade some control for simplicity, and for many workloads that's the right trade-off. Set usage limits from day one to avoid surprises, monitor your RPU consumption, and consider switching to provisioned if your usage becomes predictable and sustained.
