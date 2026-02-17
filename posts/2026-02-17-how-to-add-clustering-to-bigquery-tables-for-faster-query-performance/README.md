# How to Add Clustering to BigQuery Tables for Faster Query Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Clustering, Performance Optimization, Data Engineering

Description: Learn how to add clustering to your BigQuery tables to speed up queries and reduce costs by organizing data for efficient scanning.

---

If you have been working with BigQuery for any amount of time, you have probably noticed that query costs can spiral quickly on large tables. Partitioning helps, but it is only part of the story. Clustering is the other half - and in many cases, it delivers even bigger performance gains than partitioning alone.

I want to walk through how clustering works in BigQuery, when to use it, and how to set it up correctly.

## What Is Clustering in BigQuery?

Clustering organizes the data within a table (or within each partition of a partitioned table) based on the values in one or more columns. When you cluster a table by a column, BigQuery sorts and groups rows with similar values together in storage. This means that when you query with a filter on the clustered column, BigQuery can skip large chunks of data that do not match.

Think of it like organizing books in a library by genre, then by author within each genre. If you are looking for science fiction by a specific author, you go straight to that section instead of scanning every shelf.

## Creating a Clustered Table

Here is how to create a table with clustering. You can cluster by up to four columns.

```sql
-- Create a table clustered by region and product_category
-- BigQuery will sort and group data by these columns in storage
CREATE TABLE `my_project.my_dataset.orders_clustered`
(
  order_id INT64,
  customer_id INT64,
  region STRING,
  product_category STRING,
  order_date DATE,
  amount NUMERIC
)
CLUSTER BY region, product_category;
```

The order of clustering columns matters. BigQuery sorts first by the first column, then by the second within groups of the first, and so on. Put the column you filter on most frequently first.

## Combining Clustering with Partitioning

Clustering works best alongside partitioning. You partition for coarse-grained data division and cluster for fine-grained data organization within each partition.

```sql
-- Partition by date and cluster by region and product_category
-- This gives you both coarse (date) and fine (region, category) filtering
CREATE TABLE `my_project.my_dataset.orders_partitioned_clustered`
(
  order_id INT64,
  customer_id INT64,
  region STRING,
  product_category STRING,
  order_date DATE,
  amount NUMERIC
)
PARTITION BY order_date
CLUSTER BY region, product_category;
```

With this setup, a query filtering on `order_date` prunes partitions, and then filtering on `region` or `product_category` further narrows the scan within each remaining partition.

## Choosing Clustering Columns

Not every column is a good candidate for clustering. Here is what I look for:

**High cardinality columns that you filter on frequently**: Columns like `user_id`, `region`, `product_category`, or `status` are typical choices. The column should appear in your WHERE clauses regularly.

**Columns used in JOIN conditions**: If you frequently join on a column, clustering on it can speed up the join significantly.

**Columns used in aggregations**: GROUP BY columns benefit from clustering because BigQuery can read pre-sorted data more efficiently.

Let me show you how to check which columns your queries filter on most often.

```sql
-- Check which columns appear most in query filters
-- by looking at recent job metadata
SELECT
  referenced_table.table_id,
  query
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
LIMIT 100;
```

## Adding Clustering to an Existing Table

You cannot alter an existing table to add clustering directly. Instead, you create a new clustered table from the existing one using CTAS.

```sql
-- Create a clustered copy of an existing table
CREATE TABLE `my_project.my_dataset.orders_clustered_v2`
CLUSTER BY region, product_category
AS
SELECT *
FROM `my_project.my_dataset.orders_raw`;
```

If the original table is partitioned, preserve the partitioning in the new table.

```sql
-- Preserve partitioning while adding clustering
CREATE TABLE `my_project.my_dataset.orders_v2`
PARTITION BY order_date
CLUSTER BY region, product_category
AS
SELECT *
FROM `my_project.my_dataset.orders_raw`;
```

After verifying the new table, you can drop the old one and rename if needed.

## How Clustering Affects Query Performance

Let me show a concrete example. Say you have a 500 GB orders table. Without clustering, a query filtering on region scans all 500 GB.

```sql
-- Without clustering: scans the entire table (or entire partition)
-- With clustering on region: only scans blocks where region = 'US-West'
SELECT
  product_category,
  SUM(amount) AS total_revenue
FROM `my_project.my_dataset.orders_clustered`
WHERE region = 'US-West'
GROUP BY product_category
ORDER BY total_revenue DESC;
```

With clustering on `region`, BigQuery might only scan 50-100 GB depending on how many rows match. That is a 5-10x cost reduction on a single query.

## Understanding Automatic Re-Clustering

One nice thing about BigQuery clustering is that it is maintained automatically. When you insert, update, or stream data into a clustered table, BigQuery periodically re-clusters the data in the background. You do not need to trigger this manually, and there is no cost for the re-clustering operation itself.

However, there is a gap between when data is inserted and when it gets re-clustered. During that gap, newly inserted data might not be as well organized. For most workloads, this is not a problem - but if you are streaming millions of rows per second, be aware that very recent data might not benefit from clustering until the next re-clustering pass.

## Verifying Clustering Benefits

You can check how much data your queries actually scan to verify that clustering is helping.

```sql
-- Run a query and check bytes processed in the results metadata
-- Compare this against the full table size
SELECT
  region,
  COUNT(*) AS order_count
FROM `my_project.my_dataset.orders_clustered`
WHERE region = 'US-West'
  AND product_category = 'Electronics'
GROUP BY region;
```

In the BigQuery console, after running the query, check the "Bytes processed" in the job details. Compare it against what you see when querying the same table without the clustering filters.

You can also check table storage info to understand the clustering state.

```sql
-- Check clustering information for your table
SELECT
  table_name,
  clustering_ordinal_position,
  column_name
FROM `my_project.my_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'orders_clustered'
  AND clustering_ordinal_position IS NOT NULL
ORDER BY clustering_ordinal_position;
```

## Column Order Matters

The order of your clustering columns is significant. BigQuery sorts data by the first clustering column, then the second, and so on. This means filtering on the first clustering column gives you the most benefit.

```sql
-- Best performance: filtering on the first clustering column
SELECT * FROM `my_project.my_dataset.orders_clustered`
WHERE region = 'US-West';

-- Good performance: filtering on the first and second columns
SELECT * FROM `my_project.my_dataset.orders_clustered`
WHERE region = 'US-West' AND product_category = 'Electronics';

-- Less benefit: filtering only on the second clustering column
-- BigQuery can still use block-level pruning, but it is less efficient
SELECT * FROM `my_project.my_dataset.orders_clustered`
WHERE product_category = 'Electronics';
```

## Best Practices

Here are the practices I follow when working with clustered tables:

1. **Cluster by columns you filter on most**: Look at your most frequent and most expensive queries. Those filter columns are your clustering candidates.

2. **Put the most selective column first**: If one column has higher cardinality and is filtered on more often, make it the first clustering column.

3. **Do not over-cluster**: Four columns is the maximum, but two or three is usually sufficient. Adding more columns has diminishing returns.

4. **Monitor cost savings**: Track your bytes scanned before and after adding clustering. If you are not seeing improvement, your queries might not be using the right filters.

5. **Combine with partitioning**: Partitioning and clustering complement each other. Use partitioning for time-based or range-based coarse filtering, and clustering for fine-grained filtering within partitions.

## Wrapping Up

Adding clustering to your BigQuery tables is one of the simplest ways to improve query performance and reduce costs. It requires no changes to your queries - just define the clustering columns when you create the table, and BigQuery handles the rest. The key is choosing columns that align with your query patterns and putting them in the right order.

For teams running production analytics pipelines, monitoring query performance is critical. [OneUptime](https://oneuptime.com) can help you track query latency and cost trends across your BigQuery workloads so you can catch regressions before they become expensive.
