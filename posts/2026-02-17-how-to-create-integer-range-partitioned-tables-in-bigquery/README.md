# How to Create Integer-Range Partitioned Tables in BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Partitioning, Data Engineering, SQL

Description: Learn how to create integer-range partitioned tables in BigQuery to optimize query performance and reduce costs by scanning only relevant data ranges.

---

BigQuery is great at scanning massive datasets, but scanning everything when you only need a slice of data burns through your budget fast. If your tables have an integer column that naturally divides the data into ranges - think user IDs, product codes, or numeric identifiers - integer-range partitioning is your friend.

I have been working with BigQuery for a few years now, and integer-range partitioning is one of those features that pays for itself almost immediately once you set it up properly.

## What Is Integer-Range Partitioning?

BigQuery supports three types of partitioning: time-based (ingestion time or a TIMESTAMP/DATE column), and integer-range. Integer-range partitioning lets you split a table into segments based on the values in an INTEGER column. You define a start value, an end value, and an interval, and BigQuery creates partitions accordingly.

For example, if you have a `customer_id` column ranging from 0 to 10,000,000 and you set an interval of 100,000, BigQuery creates 100 partitions. When you query with a WHERE clause filtering on `customer_id`, BigQuery only scans the relevant partitions instead of the entire table.

## Why Use Integer-Range Partitioning?

There are a few solid reasons:

- **Cost reduction**: BigQuery charges by the amount of data scanned. Partitioning means less data scanned per query.
- **Query performance**: Fewer bytes scanned means faster query execution.
- **Predictable data organization**: When your data is naturally organized by integer keys, this partitioning scheme maps directly to your access patterns.

## Creating an Integer-Range Partitioned Table

Here is the basic syntax for creating an integer-range partitioned table. This example partitions a sales table by the `store_id` column.

```sql
-- Create a table partitioned by store_id in ranges of 100
-- Range: 0 to 10000, with each partition covering 100 store IDs
CREATE TABLE `my_project.my_dataset.sales_partitioned`
(
  store_id INT64 NOT NULL,
  product_name STRING,
  sale_amount NUMERIC,
  sale_date DATE,
  region STRING
)
PARTITION BY
  RANGE_BUCKET(store_id, GENERATE_ARRAY(0, 10000, 100));
```

Let me break down the key parts:

- `RANGE_BUCKET` is the function that maps each row to a partition.
- `GENERATE_ARRAY(0, 10000, 100)` creates the boundary points. This means partition 1 holds `store_id` values from 0 to 99, partition 2 holds 100 to 199, and so on.
- Any `store_id` value below 0 goes into an `__UNPARTITIONED__` bucket, and values at or above 10,000 also go there.

## Choosing the Right Range and Interval

The range and interval you pick depend on your data distribution and query patterns. Here are some guidelines that have worked well for me:

**Know your data bounds**: Run a quick query to check the min and max values of your partitioning column before you decide on the range.

```sql
-- Check the range of your partitioning column
SELECT
  MIN(store_id) AS min_id,
  MAX(store_id) AS max_id,
  COUNT(DISTINCT store_id) AS unique_count
FROM `my_project.my_dataset.sales_raw`;
```

**Pick an interval that creates a reasonable number of partitions**: BigQuery supports up to 4,000 partitions per table. If your range is 0 to 1,000,000, an interval of 250 gives you 4,000 partitions - right at the limit. An interval of 1,000 gives you 1,000 partitions, which is more manageable.

**Match your query patterns**: If your queries typically filter on ranges of about 500 IDs, make your interval around 500 so each query hits roughly one partition.

## Loading Data into a Partitioned Table

Once the table is created, loading data works the same as any other BigQuery table. BigQuery automatically routes rows to the correct partition.

```sql
-- Insert data into the partitioned table
-- BigQuery automatically places each row in the correct partition
INSERT INTO `my_project.my_dataset.sales_partitioned`
  (store_id, product_name, sale_amount, sale_date, region)
VALUES
  (150, 'Widget A', 29.99, '2026-01-15', 'US-West'),
  (3200, 'Widget B', 49.99, '2026-01-16', 'US-East'),
  (7800, 'Gadget C', 99.99, '2026-01-17', 'EU-West');
```

You can also load from another table or from Cloud Storage - the partitioning happens transparently.

## Querying with Partition Pruning

The real benefit shows up at query time. When you filter on the partition column, BigQuery prunes partitions it does not need.

```sql
-- This query only scans the partition containing store_id 150-199
-- Instead of scanning the entire table
SELECT
  product_name,
  SUM(sale_amount) AS total_sales
FROM `my_project.my_dataset.sales_partitioned`
WHERE store_id BETWEEN 100 AND 199
GROUP BY product_name
ORDER BY total_sales DESC;
```

You can verify partition pruning is working by checking the query execution details in the BigQuery console. Look at the "Bytes processed" metric - it should be significantly less than the total table size.

## Handling Out-of-Range Values

Values that fall outside your defined range end up in a special `__UNPARTITIONED__` partition. This is not necessarily a problem, but if a lot of your data lands there, you are not getting the full benefit of partitioning.

```sql
-- Check how much data is in the unpartitioned bucket
SELECT
  COUNT(*) AS row_count,
  SUM(sale_amount) AS total_amount
FROM `my_project.my_dataset.sales_partitioned`
WHERE store_id < 0 OR store_id >= 10000;
```

If you find too much data in the unpartitioned bucket, consider adjusting your range boundaries.

## Using CTAS to Partition an Existing Table

If you already have an unpartitioned table and want to create a partitioned version, use CREATE TABLE AS SELECT (CTAS).

```sql
-- Create a partitioned copy of an existing unpartitioned table
CREATE TABLE `my_project.my_dataset.sales_partitioned_v2`
PARTITION BY
  RANGE_BUCKET(store_id, GENERATE_ARRAY(0, 10000, 100))
AS
SELECT *
FROM `my_project.my_dataset.sales_raw`;
```

This copies all the data and partitions it in one step. Keep in mind that this counts as a full table scan on the source table, so factor that into your cost calculations.

## Monitoring Partition Usage

It is a good practice to monitor how your partitions are being used. The INFORMATION_SCHEMA views give you metadata about your partitioned tables.

```sql
-- Check partition statistics for your table
SELECT
  table_name,
  partition_id,
  total_rows,
  total_logical_bytes
FROM `my_project.my_dataset.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'sales_partitioned'
ORDER BY partition_id;
```

This helps you identify skewed partitions - if one partition has 10x the rows of others, your queries hitting that partition will still be slow.

## Common Pitfalls

Here are some things I have run into that are worth knowing:

1. **Forgetting the NOT NULL constraint**: The partition column should be NOT NULL. If it is nullable, null values go into a special `__NULL__` partition, which might not be what you want.

2. **Too many partitions**: Each partition adds overhead. If you create 4,000 tiny partitions, the metadata management can slow things down. Find a balance.

3. **Not using the partition column in WHERE clauses**: If your queries do not filter on the partition column, BigQuery scans all partitions anyway. The partitioning only helps if you actually use it.

4. **Picking the wrong column**: Choose a column that your queries frequently filter on. If you partition by `store_id` but always query by `region`, the partitioning does nothing useful.

## Wrapping Up

Integer-range partitioning in BigQuery is straightforward to set up and can dramatically cut both query costs and execution time. The key is choosing the right column, setting appropriate range boundaries, and making sure your queries actually filter on the partition column. Once you have it in place, BigQuery handles the rest automatically - routing inserts to the right partition and pruning irrelevant partitions at query time.

If you are running monitoring and observability workloads on BigQuery, tools like [OneUptime](https://oneuptime.com) can help you keep track of your query costs and table performance over time, so you can spot when your partitioning strategy needs adjustment.
