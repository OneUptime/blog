# How to Monitor AlloyDB Performance Using Query Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, Query Insights, Performance, Monitoring

Description: A practical guide to using AlloyDB Query Insights to identify slow queries, analyze execution plans, and optimize database performance in Google Cloud.

---

If you have ever stared at a dashboard wondering why your AlloyDB cluster is running slow, you know how frustrating database performance debugging can be. AlloyDB Query Insights is a built-in tool that gives you visibility into query performance without installing third-party monitoring agents or modifying your application code.

In this post, I will show you how to enable Query Insights, interpret the data it collects, and use it to track down and fix performance bottlenecks.

## What Query Insights Actually Does

Query Insights collects and aggregates performance data about the SQL queries running on your AlloyDB instances. It tracks things like:

- Query execution time (latency)
- Rows retrieved or affected
- Wait events (I/O, lock contention, CPU)
- Sampled query plans
- Top queries by various metrics

You can access one week of data on the Query Insights dashboard, and the metrics are also available through Cloud Monitoring. The overhead is minimal - Google designed it to run in production with a small expected performance impact.

## Enabling Query Insights

Query Insights is enabled by default on AlloyDB instances. You can edit its configuration at the instance level during instance creation or by updating an existing instance.

To update the Query Insights configuration on an existing primary instance:

```bash
# Update Query Insights settings on an existing AlloyDB instance

gcloud alloydb instances update my-primary-instance \
  --cluster=my-cluster \
  --region=us-central1 \
  --insights-config-query-string-length=1024 \
  --insights-config-query-plans-per-minute=5 \
  --insights-config-record-application-tags
```

Here is what each flag controls:

- `--insights-config-query-string-length`: How many bytes of the query string to capture, from 256 to 4500. The default is 1024. Increase it if your queries are long and you need to see more text. Changing this value requires an instance restart.
- `--insights-config-query-plans-per-minute`: How many query execution plans to capture per minute. The default is 5, valid values are 0 through 20, and setting it to 0 disables query plan sampling.
- `--insights-config-record-application-tags`: When enabled, Query Insights captures application-level tags you set via SQL comments, which lets you trace queries back to specific parts of your application.

## Navigating the Query Insights Dashboard

Once enabled, open the Google Cloud Console, navigate to AlloyDB, select your cluster, and click on the "Query Insights" tab. The dashboard has several sections worth exploring.

### Database Load Chart

The main chart shows database load over time, broken down by wait event type. This is your starting point for performance investigations. The wait event categories include:

- **CPU**: Time spent executing queries on CPU
- **IO**: Time waiting for disk reads or writes
- **Lock**: Time waiting to acquire locks
- **LWLock**: Time waiting for lightweight locks (internal PostgreSQL locks)
- **BufferPin**: Time waiting for buffer pin operations

If you see spikes in the IO category, your queries might be scanning too many rows. Lock wait spikes usually indicate contention between concurrent transactions.

### Top Queries Table

Below the chart, you will find a table of the most resource-intensive queries. You can sort by:

- Average execution time
- Total execution time
- Number of calls
- Average rows fetched

This table normalizes queries by replacing literal values with placeholders, so `SELECT * FROM users WHERE id = 42` and `SELECT * FROM users WHERE id = 99` show up as a single entry: `SELECT * FROM users WHERE id = $1`.

## Using Application Tags for Tracing

One of the most useful features is application tagging. By adding SQL comments in a specific format, you can trace queries back to their origin in your code.

Here is how to tag queries in your application. The following example uses Python with psycopg2:

```python
# Tag queries with application context using SQL comments
# AlloyDB Query Insights will parse these tags automatically
import psycopg2

conn = psycopg2.connect("dbname=mydb host=10.0.0.5")
cur = conn.cursor()

# Add tags as SQL comments - Query Insights picks these up
cur.execute("""
    SELECT o.id, o.total, c.name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.status = %s
    ORDER BY o.created_at DESC
    LIMIT 50
    /* controller='OrderController',action='list_orders',
       application='orders-api' */
""", ('pending',))

results = cur.fetchall()
```

With tagging enabled, you can filter the Query Insights dashboard by supported sqlcommenter tags such as controller, action, framework, route, application, and database driver. Query Insights drops unsupported custom keys, so use those supported tag names when you want tags to appear in the dashboard. This makes it straightforward to identify which API endpoint or background job is generating problematic queries.

## Analyzing Query Plans

Query Insights captures execution plans for sampled queries. To view them, click on a specific query in the top queries table, then navigate to the "Query Plans" tab.

The execution plan shows you how PostgreSQL decided to execute the query - which indexes it used, whether it did sequential scans, how it joined tables, and the estimated vs. actual row counts.

Here are the things to look for in a query plan:

- **Seq Scan on large tables**: If you see a sequential scan on a table with millions of rows, you probably need an index.
- **Nested Loop with high row counts**: Nested loops are fine for small result sets but can be devastating when the inner loop processes thousands of rows.
- **Hash Join with large hash tables**: Watch for hash joins that spill to disk because the work_mem setting is too low.
- **Sort operations**: External sorts (on disk) are much slower than in-memory sorts. Consider adding indexes that support your ORDER BY clauses.

## Setting Up Alerts Based on Query Insights

You can create Cloud Monitoring alerts based on AlloyDB metrics to get notified when performance degrades:

```bash
# Create an alert for high average query latency
gcloud monitoring policies create \
  --display-name="AlloyDB High Query Latency" \
  --condition-display-name="Query latency above 500ms" \
  --condition-filter='resource.type="alloydb.googleapis.com/Database" AND metric.type="alloydb.googleapis.com/database/postgresql/insights/aggregate/latencies"' \
  --aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_PERCENTILE_99"}' \
  --if="> 500000" \
  --duration=300s \
  --notification-channels=projects/my-project/notificationChannels/12345
```

## Common Performance Issues and Fixes

Here are patterns I frequently encounter when using Query Insights:

### Missing Indexes

Query Insights shows a query fetching far more rows than the application needs, or the sampled query plan shows a sequential scan on a large table. The fix is usually straightforward:

```sql
-- Create an index to support the frequently queried column
-- This turns a sequential scan into an index scan
CREATE INDEX idx_orders_status_created
ON orders (status, created_at DESC);
```

### N+1 Query Patterns

The top queries table shows a simple SELECT being called thousands of times per minute. This usually means your application is fetching related records one at a time instead of in bulk:

```sql
-- Instead of fetching one order's items at a time (N+1 pattern),
-- fetch all items for a batch of orders in a single query
SELECT oi.order_id, oi.product_id, oi.quantity, p.name
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = ANY($1::int[]);
```

### Lock Contention

The database load chart shows spikes in the Lock wait event. This often happens when multiple transactions try to update the same rows. Consider using advisory locks or redesigning your workflow to reduce contention.

## Exporting Query Insights Data

For longer-term analysis, you can export AlloyDB metrics from the Cloud Monitoring API to BigQuery with a scheduled job:

```bash
# Create the destination dataset for exported metrics
bq mk --location=US --dataset my-project:alloydb_metrics
```

The job can call the Cloud Monitoring `timeSeries.list` API for metrics such as `alloydb.googleapis.com/database/postgresql/insights/aggregate/latencies` and write the returned time-series points into BigQuery. This lets you run historical analysis across weeks or months of data, which is useful for capacity planning and tracking whether your optimizations are having the desired effect.

## Wrapping Up

Query Insights removes a lot of the guesswork from AlloyDB performance tuning. Keep it configured on your instances, set up application tagging so you can trace queries back to your code, and check the dashboard regularly - not just when things break. The queries that are slow today might become the outage of tomorrow if your data grows and the query plan does not scale. Catching these issues early with Query Insights is much easier than debugging them during an incident.
