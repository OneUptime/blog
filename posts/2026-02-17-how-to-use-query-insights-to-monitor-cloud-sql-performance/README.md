# How to Use Query Insights to Monitor Cloud SQL Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Query Insights, Performance Monitoring, Database

Description: Learn how to enable and use Cloud SQL Query Insights to identify slow queries, analyze database load, and optimize your application's database performance.

---

Finding the slow queries that are dragging down your database used to mean digging through slow query logs and manually correlating them with performance metrics. Cloud SQL Query Insights changes that by providing an integrated dashboard that shows database load, top queries, and performance trends. This guide covers how to enable it, read the dashboards, and use the data to actually fix performance problems.

## What Query Insights Provides

Query Insights gives you:

- **Database load graph**: Shows total database load broken down by wait event types
- **Top queries by load**: Identifies which queries consume the most database time
- **Query plan analysis**: Shows execution plans for slow queries
- **Tag-based filtering**: Filter queries by application, user, or custom tags
- **Historical data**: Up to 7 days of query performance history

Think of it as a lightweight APM tool specifically for your database.

## Enabling Query Insights

### For PostgreSQL

```bash
# Enable Query Insights for a PostgreSQL instance
gcloud sql instances patch my-pg-instance \
    --insights-config-query-insights-enabled \
    --insights-config-query-string-length=4096 \
    --insights-config-record-application-tags \
    --insights-config-record-client-address
```

### For MySQL

```bash
# Enable Query Insights for a MySQL instance
gcloud sql instances patch my-mysql-instance \
    --insights-config-query-insights-enabled \
    --insights-config-query-string-length=4096 \
    --insights-config-record-application-tags \
    --insights-config-record-client-address
```

### Using Terraform

```hcl
# Terraform configuration with Query Insights enabled
resource "google_sql_database_instance" "main" {
  name             = "my-instance"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-custom-4-16384"

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 4096
      record_application_tags = true
      record_client_address   = true
      query_plans_per_minute  = 5
    }
  }
}
```

The configuration options:

- `query_insights_enabled` - Turns Query Insights on
- `query_string_length` - Maximum query string length to capture (up to 4500)
- `record_application_tags` - Capture application tags for filtering
- `record_client_address` - Record which client IPs are running queries
- `query_plans_per_minute` - How many execution plans to capture per minute

## Accessing Query Insights

Open the Google Cloud Console, navigate to your Cloud SQL instance, and click the **Query Insights** tab. The dashboard has three main views.

### Database Load Graph

This is the first thing you see. It shows the average number of active queries over time, broken down by wait event type:

- **CPU**: Query is actively using CPU
- **IO**: Query is waiting for disk I/O
- **Lock**: Query is waiting for a lock
- **Other**: Other wait types (network, IPC, etc.)

A healthy database shows mostly CPU activity with minimal lock waits. If you see large IO or Lock sections, those are your optimization targets.

### Top Queries

Below the load graph, you will find the list of queries ranked by their contribution to database load. Each entry shows:

- Normalized query text (with literal values replaced by placeholders)
- Average execution time
- Number of executions
- Total load contribution

Click on any query to see its execution plan and detailed statistics.

### Query Details

For each query, you can see:

- Execution time distribution over the selected time range
- Number of rows returned versus rows scanned
- Execution plans (EXPLAIN output)
- Which client addresses are running this query
- Application tags if configured

## Using Application Tags

Application tags let you group queries by feature or service. Set them in your application code.

### PostgreSQL Tags

```python
# Python - Set application tags for Query Insights filtering
import psycopg2

conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    dbname="mydb",
    user="myuser",
    password="password",
    options="-c cloudsql.enable_tag=true"  # Enable tagging
)

cursor = conn.cursor()

# Set tags for the current session
cursor.execute("SET cloudsql.application_tag = 'checkout-service'")

# Now any queries in this session will be tagged
cursor.execute("SELECT * FROM orders WHERE user_id = %s", (user_id,))
```

### MySQL Tags

```python
# Python - Set application tags for MySQL
import mysql.connector

conn = mysql.connector.connect(
    host="127.0.0.1",
    port=3306,
    database="mydb",
    user="myuser",
    password="password"
)

cursor = conn.cursor()

# Add a query attribute that Query Insights captures
cursor.execute("SELECT /*+ TAG('checkout-service') */ * FROM orders WHERE user_id = %s", (user_id,))
```

Tags help you answer questions like "which microservice is generating the most database load?" or "are queries from the reporting service affecting the main application?"

## Identifying and Fixing Common Problems

### Problem 1: Full Table Scans

In Query Insights, look for queries with a high ratio of rows scanned to rows returned:

```
Rows returned: 10
Rows scanned: 5,000,000
```

This indicates a missing index. Check the execution plan and add the appropriate index:

```sql
-- The query from Query Insights
-- SELECT * FROM orders WHERE customer_email = 'user@example.com'

-- Add an index to fix the full table scan
CREATE INDEX idx_orders_customer_email ON orders(customer_email);

-- Verify the index is being used
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_email = 'user@example.com';
```

### Problem 2: Lock Contention

If the database load graph shows significant time in Lock waits, identify the conflicting queries:

For PostgreSQL:

```sql
-- Find queries waiting for locks
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.query AS blocked_query,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.query AS blocking_query,
    now() - blocked_activity.xact_start AS blocked_duration
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Problem 3: Inefficient Joins

Queries with multiple joins that scan too many rows often show high CPU and IO load:

```sql
-- Before: Slow join without proper indexes
SELECT o.*, p.name
FROM orders o
JOIN products p ON p.id = o.product_id
WHERE o.created_at > '2026-01-01';

-- Add a composite index for the filtered join
CREATE INDEX idx_orders_created_product ON orders(created_at, product_id);
```

### Problem 4: N+1 Query Pattern

Query Insights might show the same simple query executed thousands of times in a short period. This is the N+1 pattern:

```
SELECT * FROM products WHERE id = ?
-- Executed 500 times in 1 second
```

Fix this in your application by using batch queries or eager loading:

```python
# Instead of N+1 queries:
# for order in orders:
#     product = db.query("SELECT * FROM products WHERE id = ?", order.product_id)

# Use a single batch query:
product_ids = [order.product_id for order in orders]
products = db.query("SELECT * FROM products WHERE id = ANY(%s)", (product_ids,))
```

## Setting Up Alerts Based on Query Insights

Create alerts for query performance degradation:

```bash
# Alert when database load exceeds 80% of available CPU cores
gcloud monitoring policies create \
    --display-name="Cloud SQL High Load" \
    --condition-display-name="DB Load > 80%" \
    --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/cpu/utilization"' \
    --condition-threshold-value=0.8 \
    --condition-threshold-duration=300s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

## Exporting Query Insights Data

For longer-term analysis or custom dashboards, export the data:

```bash
# Query insights data is available through Cloud Monitoring
# Export to BigQuery for custom analysis
gcloud monitoring export create my-export \
    --dataset=projects/my-project/datasets/monitoring_export
```

You can also use the Cloud SQL Admin API to programmatically access query statistics.

## Query Insights Overhead

Query Insights has minimal performance impact:

- Approximately 1-2% overhead on query execution time
- Small increase in memory usage for query statistics
- Execution plan capture is sampled (not every execution)

For the vast majority of workloads, this overhead is negligible compared to the debugging time it saves.

## Comparing Query Insights with pg_stat_statements

If you are already using `pg_stat_statements`, Query Insights adds:

- A visual dashboard (no SQL needed to view stats)
- Wait event breakdowns
- Application tag filtering
- Client address tracking
- Integrated execution plans
- Cloud Monitoring integration for alerting

You can use both simultaneously. They are complementary - `pg_stat_statements` gives you raw data you can query with SQL, while Query Insights provides a ready-made analysis interface.

## Summary

Cloud SQL Query Insights is one of the most useful features you can enable on your instance. It takes minutes to turn on and immediately gives you visibility into what your database is doing. Use the load graph to spot problems, the top queries list to identify culprits, and the execution plans to figure out fixes. Enable application tags for multi-service environments, and set up alerts for when load exceeds your thresholds. The small performance overhead is a worthwhile trade-off for the debugging time it saves.
