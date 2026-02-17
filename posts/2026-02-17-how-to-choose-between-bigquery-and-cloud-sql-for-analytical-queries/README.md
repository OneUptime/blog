# How to Choose Between BigQuery and Cloud SQL for Analytical Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Cloud SQL, Analytics, SQL, Data Warehouse

Description: Understand when to use BigQuery versus Cloud SQL for analytical workloads and how to get the best performance from each for your query patterns.

---

I see this question come up regularly: should you run your analytical queries against BigQuery or can Cloud SQL handle it? The answer depends on your data volume, query complexity, and how much you are willing to spend. Both run SQL, both can handle aggregations, but they are built for fundamentally different workloads.

## The Core Difference

**Cloud SQL** is an OLTP (Online Transaction Processing) database. It stores data in rows, optimized for reading and writing individual records. It handles analytical queries, but it processes them by scanning rows.

**BigQuery** is an OLAP (Online Analytical Processing) data warehouse. It stores data in columns, optimized for scanning large amounts of data across specific columns. It is built from the ground up for aggregate queries over massive datasets.

This architectural difference means the same query can perform very differently on each platform, depending on what the query does.

## When Cloud SQL Is Enough

Cloud SQL handles analytical queries fine when:

- Your dataset is under 100 GB
- Your queries involve a small number of records (filtered by indexed columns)
- You need sub-second response times for dashboard queries
- Your application already uses Cloud SQL for transactional data
- You do not want to maintain a separate data warehouse

Here is an example where Cloud SQL performs well:

```sql
-- This query runs fast on Cloud SQL with proper indexes
-- It filters to a small subset of data using indexed columns
SELECT
    DATE(created_at) as day,
    status,
    COUNT(*) as order_count,
    SUM(total_amount) as revenue
FROM orders
WHERE created_at >= '2026-01-01'
    AND created_at < '2026-02-01'
    AND store_id = 42
GROUP BY day, status
ORDER BY day;
```

With an index on `(store_id, created_at)`, Cloud SQL processes this in milliseconds because it only reads a narrow range of rows.

```bash
# Create an appropriate index for the query pattern
gcloud sql connect my-instance --user=postgres <<EOF
CREATE INDEX idx_orders_store_date
ON orders (store_id, created_at)
INCLUDE (status, total_amount);
EOF
```

Cloud SQL is also good for queries that join a few tables on indexed keys:

```sql
-- Joins on indexed foreign keys are efficient on Cloud SQL
SELECT
    c.name,
    c.email,
    COUNT(o.id) as order_count,
    SUM(o.total_amount) as total_spent
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.created_at >= '2026-01-01'
GROUP BY c.id, c.name, c.email
HAVING SUM(o.total_amount) > 1000
ORDER BY total_spent DESC
LIMIT 100;
```

## When BigQuery Is the Right Choice

BigQuery shines when:

- Your dataset is in the hundreds of GB or TB range
- Queries scan large portions of tables (full table scans, wide time ranges)
- You need to join many large tables
- Multiple users run ad-hoc analytical queries
- You want to separate analytical workload from transactional workload

Here is where BigQuery excels:

```sql
-- This query scans a year of data across a large table
-- BigQuery handles this in seconds; Cloud SQL might take minutes
SELECT
    FORMAT_DATE('%Y-%m', order_date) as month,
    product_category,
    region,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(*) as order_count,
    SUM(amount) as total_revenue,
    AVG(amount) as avg_order_value,
    APPROX_QUANTILES(amount, 100)[OFFSET(50)] as median_order_value
FROM `my-project.analytics.orders`
WHERE order_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY month, product_category, region
ORDER BY month, total_revenue DESC;
```

BigQuery also handles complex analytical queries that would overwhelm Cloud SQL:

```sql
-- Cohort analysis - practically impossible to run at scale on Cloud SQL
WITH first_purchase AS (
    SELECT
        customer_id,
        DATE_TRUNC(MIN(order_date), MONTH) as cohort_month
    FROM `my-project.analytics.orders`
    GROUP BY customer_id
),
monthly_activity AS (
    SELECT
        customer_id,
        DATE_TRUNC(order_date, MONTH) as activity_month
    FROM `my-project.analytics.orders`
    GROUP BY customer_id, DATE_TRUNC(order_date, MONTH)
)
SELECT
    fp.cohort_month,
    DATE_DIFF(ma.activity_month, fp.cohort_month, MONTH) as months_since_first,
    COUNT(DISTINCT ma.customer_id) as active_customers,
    COUNT(DISTINCT ma.customer_id) / MAX(cohort_size.size) as retention_rate
FROM first_purchase fp
JOIN monthly_activity ma ON fp.customer_id = ma.customer_id
JOIN (
    SELECT cohort_month, COUNT(*) as size
    FROM first_purchase
    GROUP BY cohort_month
) cohort_size ON fp.cohort_month = cohort_size.cohort_month
GROUP BY fp.cohort_month, months_since_first
ORDER BY fp.cohort_month, months_since_first;
```

## Performance Comparison

Let me put some rough numbers on this. For a table with 100 million rows:

| Query Type | Cloud SQL | BigQuery |
|-----------|-----------|----------|
| Point lookup by primary key | <10 ms | 1-2 seconds |
| Range scan on indexed column (1K rows) | <100 ms | 1-2 seconds |
| Full table aggregation | 30-120 seconds | 3-10 seconds |
| Complex join of 3 large tables | Minutes to timeout | 5-30 seconds |
| Ad-hoc query on non-indexed column | Minutes | 3-10 seconds |

BigQuery has a minimum query overhead of about 1-2 seconds due to its distributed architecture. For small, targeted queries, Cloud SQL is faster. For large scan queries, BigQuery wins by a huge margin.

## Cost Comparison

BigQuery charges per query based on bytes scanned. Cloud SQL charges for the instance regardless of query volume.

```
Scenario: 10 GB dataset, 100 queries per day, each scanning 1 GB

Cloud SQL (db-custom-4-16384):
  Instance cost: ~$200/month
  No per-query cost
  Total: ~$200/month

BigQuery:
  Storage: 10 GB x $0.02 = $0.20/month
  Query: 100 queries x 1 GB x $5/TB x 30 days = $15/month
  Total: ~$15.20/month
```

```
Scenario: 1 TB dataset, 1000 queries per day, each scanning 100 GB

Cloud SQL (db-custom-16-65536):
  Instance cost: ~$800/month (if it can even handle the workload)

BigQuery:
  Storage: 1 TB x $0.02 = $20/month
  Query: 1000 queries x 100 GB x $5/TB x 30 days = $15,000/month
  Total: ~$15,020/month (but consider partitioning to reduce scan)
```

For BigQuery, partitioning and clustering dramatically reduce costs:

```sql
-- Partitioned table scans much less data per query
CREATE TABLE `my-project.analytics.orders_partitioned`
PARTITION BY DATE(order_date)
CLUSTER BY product_category, region
AS SELECT * FROM `my-project.analytics.orders`;

-- This query now scans only the relevant date partition
-- Instead of scanning 1 TB, it might scan 3 GB
SELECT product_category, SUM(amount)
FROM `my-project.analytics.orders_partitioned`
WHERE order_date = '2026-02-01'
GROUP BY product_category;
```

## The Hybrid Approach

Many teams use both. Cloud SQL handles the transactional workload, and BigQuery handles analytics. You sync data from Cloud SQL to BigQuery on a schedule.

```bash
# Export Cloud SQL data to BigQuery using a Dataflow template
gcloud dataflow jobs run cloud-sql-to-bq \
    --gcs-location=gs://dataflow-templates/latest/Cloud_SQL_to_BigQuery \
    --region=us-central1 \
    --parameters \
connectionURL=jdbc:postgresql://google/mydb?cloudSqlInstance=project:region:instance,\
query="SELECT * FROM orders WHERE updated_at > TIMESTAMP '2026-02-16'",\
outputTable=my-project:analytics.orders,\
bigQueryLoadingTemporaryDirectory=gs://my-temp/bq-staging/
```

Or use Federated Queries to query Cloud SQL directly from BigQuery:

```sql
-- Query Cloud SQL directly from BigQuery using federated queries
-- Good for small, infrequent queries; not great for large scans
SELECT *
FROM EXTERNAL_QUERY(
    'projects/my-project/locations/us-central1/connections/my-sql-connection',
    'SELECT customer_id, email, created_at FROM customers WHERE created_at > NOW() - INTERVAL 1 DAY'
);
```

## Decision Framework

Ask yourself these questions:

1. **How much data?** Under 50 GB, Cloud SQL is fine. Over 100 GB, seriously consider BigQuery.

2. **How are queries filtered?** If queries always filter on indexed columns and touch small subsets, Cloud SQL works well. If queries scan large portions of tables, BigQuery is better.

3. **How many concurrent analytical users?** If multiple analysts run ad-hoc queries, BigQuery isolates their workloads. On Cloud SQL, heavy analytical queries can impact your transactional workload.

4. **Do you need real-time data?** Cloud SQL queries see the latest committed data. BigQuery has some lag if you are loading data from an external source (though streaming inserts are near real-time).

5. **Budget?** BigQuery is cheaper for large-scale analytics if you use partitioning. Cloud SQL is simpler for small datasets since you are already paying for the instance.

## Conclusion

Do not use BigQuery for transactional workloads, and do not use Cloud SQL as your data warehouse. Each is excellent at what it is designed for. For small to medium datasets where analytical queries are a minor part of the workload, Cloud SQL is perfectly adequate. Once your data grows or your analytical needs become complex, move that workload to BigQuery and let each database do what it does best.
