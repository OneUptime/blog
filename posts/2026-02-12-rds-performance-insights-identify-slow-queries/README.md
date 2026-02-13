# How to Use RDS Performance Insights to Identify Slow Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Performance, Database, SQL

Description: A practical guide to finding and fixing slow database queries using Amazon RDS Performance Insights with real-world troubleshooting examples.

---

Your application is slow and you suspect the database. CloudWatch shows CPU is high, but that doesn't tell you which query is causing the problem. You could enable slow query logs and sift through thousands of lines, or you could open RDS Performance Insights and find the answer in about 30 seconds.

Performance Insights isn't just a pretty dashboard. It's a powerful tool for pinpointing exactly which SQL statements are dragging down your database. Let's walk through how to use it effectively to identify, analyze, and fix slow queries.

## The Starting Point: Database Load

When you open Performance Insights, the first thing you see is the database load chart. This shows Average Active Sessions (AAS) over time, broken down by wait events. Think of it as a real-time view of how busy your database is.

The key reference line is your vCPU count. If you're running a `db.r6g.xlarge` (4 vCPUs), any time the AAS goes above 4, your database has more work than it can process simultaneously. Sessions start queuing, and latency goes up.

When you see a spike in the load chart, that's your starting point. Click on the time range around the spike to zoom in, and then look at the SQL tab below.

## Finding the Top Resource-Consuming Queries

The Top SQL section ranks queries by their contribution to database load. The query at the top is consuming the most resources relative to everything else running.

Here's what the columns mean in practice:

- **Load by waits (AAS)**: How many sessions are actively running this query at any given moment. A value of 2.0 means on average, 2 sessions are executing this query simultaneously.
- **% DB load**: This query's share of total database load. If one query accounts for 60% of the load, it's probably your culprit.
- **Calls/sec**: Execution frequency. A query running 10,000 times per second has a much bigger aggregate impact than one running once per minute, even if the latter is slower per execution.
- **Avg latency (ms)**: Mean execution time. This is the most intuitive metric - how long does each run of this query take?

## Real-World Troubleshooting Example

Let's walk through a realistic scenario. Your team reports that the application is slow. You open Performance Insights and see:

The AAS chart shows a spike starting at 2:15 PM, with most of the load colored as IO wait. You zoom into that window and look at the Top SQL tab.

The top query is:

```sql
SELECT o.*, c.name, c.email
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
```

It shows:
- Load by waits: 3.2 AAS (on a 4 vCPU instance - this one query is using 80% of capacity)
- Calls/sec: 45
- Avg latency: 850ms
- Rows examined/call: 2,400,000

That rows examined number is the red flag. The query is scanning 2.4 million rows per execution, 45 times per second. The IO wait makes sense now - it's constantly reading data from disk.

## Drilling Deeper into a Slow Query

Click on the problematic query in Performance Insights to see its details. You'll get:

1. **Wait event breakdown for that specific query**: Is it spending time on CPU (processing), IO (reading data), or locks (waiting for other transactions)?

2. **Statistics over time**: Has this query always been slow, or did it recently get worse? A query that was fine last week but slow now might be affected by data growth or a schema change.

3. **The full SQL text**: Performance Insights shows the digest (parameterized) version by default. Click through to see the full text with actual parameter values.

## Common Patterns and How to Fix Them

### Pattern 1: Missing Index

**Symptoms**: High IO wait, high rows examined vs rows returned ratio.

```sql
-- This query scans the entire orders table looking for pending orders
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 20;
```

If the `orders` table has millions of rows but only a few thousand are pending, you need a composite index:

```sql
-- Add an index that covers both the WHERE clause and ORDER BY
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
```

After adding this index, the query goes from scanning millions of rows to reading just the rows it needs from the index.

### Pattern 2: N+1 Query Problem

**Symptoms**: A simple query appears in Top SQL with extremely high calls/sec but low individual latency.

```sql
-- This query runs once per order in a loop - 5000 orders means 5000 queries
SELECT * FROM order_items WHERE order_id = ?;
```

The fix is to batch the lookups:

```sql
-- Fetch all items for multiple orders in one query
SELECT * FROM order_items WHERE order_id IN (?, ?, ?, ...);
```

Or better yet, use a JOIN in the original query.

### Pattern 3: Lock Contention

**Symptoms**: High lock wait events, relatively few calls/sec but high AAS.

```sql
-- Long-running transaction holds locks that block other sessions
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 42;
-- ... application does other work while the transaction is open ...
COMMIT;
```

Long-running transactions holding row locks cause other sessions to queue up. The fix is to minimize the transaction duration:

```python
# Bad: doing external work inside a transaction
with db.transaction():
    db.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 42")
    result = call_external_payment_api()  # This could take seconds
    db.execute("INSERT INTO payments ...")

# Good: do external work first, then use a short transaction
result = call_external_payment_api()
with db.transaction():
    db.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 42")
    db.execute("INSERT INTO payments ...")
```

### Pattern 4: Inefficient Sorting

**Symptoms**: High CPU wait, query uses filesort or temp tables.

```sql
-- Sorting a large result set without an index to support the ORDER BY
SELECT * FROM products WHERE category_id = 5 ORDER BY popularity DESC, created_at DESC;
```

If there's no index covering both the WHERE and ORDER BY columns, the database has to fetch all matching rows and sort them in memory (or on disk if the result set is large). Add a composite index:

```sql
-- Create an index that supports both filtering and sorting
CREATE INDEX idx_products_cat_pop_created
ON products(category_id, popularity DESC, created_at DESC);
```

## Using Performance Insights API for Automated Detection

You can build automated slow query detection using the Performance Insights API:

```python
import boto3
from datetime import datetime, timedelta

def find_slow_queries(instance_id, threshold_aas=1.0):
    """Find queries contributing more than threshold_aas to database load."""
    pi = boto3.client('pi')
    rds = boto3.client('rds')

    # Get the DBI resource ID
    instance = rds.describe_db_instances(
        DBInstanceIdentifier=instance_id
    )['DBInstances'][0]
    resource_id = instance['DbiResourceId']

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(minutes=30)

    # Get top SQL by database load
    response = pi.get_resource_metrics(
        ServiceType='RDS',
        Identifier=resource_id,
        MetricQueries=[{
            'Metric': 'db.load.avg',
            'GroupBy': {'Group': 'db.sql', 'Limit': 10}
        }],
        StartTime=start_time,
        EndTime=end_time,
        PeriodInSeconds=300
    )

    slow_queries = []
    for data_point in response['MetricList'][0]['DataPoints']:
        for group in data_point.get('Groups', []):
            aas = group['Values'][0]
            if aas > threshold_aas:
                sql = group['Dimensions'].get('db.sql.statement', 'Unknown')
                slow_queries.append({
                    'sql': sql,
                    'aas': aas,
                    'timestamp': data_point['Timestamp']
                })

    return slow_queries
```

## Building a Query Optimization Workflow

Once you've identified slow queries, here's a systematic approach to fix them:

1. **Get the execution plan**: Run `EXPLAIN ANALYZE` on the query in a non-production environment
2. **Check the index usage**: Look for sequential scans, nested loops over large tables, and sort operations
3. **Add or modify indexes**: Based on what the execution plan tells you
4. **Test the improvement**: Run the query again and compare execution plans
5. **Monitor after deployment**: Check Performance Insights after deploying the fix to confirm the improvement

Performance Insights gives you the visibility to stop guessing and start fixing. Instead of adding more hardware every time things slow down, you can address the actual root cause. For more on monitoring your RDS instances comprehensively, check out our guide on [enabling Enhanced Monitoring](https://oneuptime.com/blog/post/2026-02-12-enable-rds-enhanced-monitoring/view) to complement what Performance Insights shows you.
