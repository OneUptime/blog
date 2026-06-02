# How to Optimize Redshift Distribution and Sort Keys

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, Performance, Database, Data Warehouse

Description: Learn how to choose and configure distribution and sort keys in Amazon Redshift to dramatically improve query performance and reduce data movement across nodes.

---

If you've been running Redshift for a while and your queries still take longer than expected, there's a good chance your distribution and sort keys aren't configured correctly. These two settings have a massive impact on how Redshift stores, retrieves, and joins data - and getting them wrong means you're leaving performance on the table.

Let's walk through what distribution keys and sort keys actually do, how to pick the right ones, and the common mistakes that trip people up.

## What Are Distribution Keys?

When you load data into a Redshift table, the rows get spread across the cluster's compute node slices. The distribution key (DISTKEY) determines which slice each row lands on. The goal is to distribute data evenly across all slices while also minimizing the amount of data that needs to move between nodes during joins.

Redshift supports four distribution styles:

- **KEY** - Rows with the same distribution key value land on the same slice
- **EVEN** - Rows are distributed round-robin across all slices
- **ALL** - A full copy of the table is placed on every node
- **AUTO** - Redshift picks the distribution style based on the table size

Here's how you set a distribution key when creating a table:

```sql
-- Create a sales table with customer_id as the distribution key
-- This ensures all rows for a given customer are on the same slice
CREATE TABLE sales (
    sale_id BIGINT IDENTITY(1,1),
    customer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    sale_date DATE NOT NULL,
    amount DECIMAL(10,2),
    region VARCHAR(50)
)
DISTSTYLE KEY
DISTKEY (customer_id);
```

## Choosing the Right Distribution Key

The ideal distribution key should satisfy two goals: even data distribution and colocation of join partners. If you frequently join your `sales` table to a `customers` table on `customer_id`, then making `customer_id` the distribution key on both tables means those joins happen locally on each slice without any network shuffling.

You can check how evenly your data is distributed by querying the system tables:

```sql
-- Check the row distribution across slices for a table
-- Look for skew - ideally all slices should have similar row counts
SELECT
    trim(name) AS tablename,
    slice,
    SUM(num_values) AS row_count
FROM svv_diskusage
WHERE name = 'sales'
  AND col = 0
GROUP BY trim(name), slice
ORDER BY slice;
```

A simpler way to check for skew:

```sql
-- Quick skew check using the system table
-- A skew ratio close to 1.0 means even distribution
SELECT
    "table" AS tablename,
    skew_rows AS skew_ratio
FROM svv_table_info
WHERE "table" = 'sales';
```

If the skew ratio is significantly above 1.0, your distribution key has too many rows landing on the same slice. You'll want to pick a different column with higher cardinality.

## When to Use DISTSTYLE ALL

Small dimension tables that you join frequently are great candidates for `DISTSTYLE ALL`. Since the entire table lives on every node, joins with these tables never require data movement.

```sql
-- Small, slow-moving lookup table replicated to all nodes
-- Useful when redistribution cost is higher than the extra storage and maintenance cost
CREATE TABLE product_categories (
    category_id INTEGER PRIMARY KEY,
    category_name VARCHAR(100),
    parent_category_id INTEGER
)
DISTSTYLE ALL;
```

The tradeoff is that every `INSERT`, `UPDATE`, or `DELETE` has to happen on all nodes. So this only makes sense for tables that don't change often and aren't very large.

## Understanding Sort Keys

Sort keys determine the physical order of rows on disk within each slice. Redshift stores data in 1MB blocks, and each block records the minimum and maximum values of the sort key columns. When your query filters on the sort key, Redshift can skip entire blocks that don't contain matching data. This is called zone map filtering, and it's one of Redshift's biggest performance advantages.

There are two types of sort keys:

- **Compound sort keys** - A multi-column sort in the order you specify. Useful when you always filter on the leading columns.
- **Interleaved sort keys** - Gives equal weight to each column. Useful when you filter on different columns in different queries.

```sql
-- Compound sort key example
-- Queries filtering on sale_date will benefit most
-- Queries on sale_date AND region benefit even more
CREATE TABLE sales_compound (
    sale_id BIGINT IDENTITY(1,1),
    customer_id INTEGER,
    product_id INTEGER,
    sale_date DATE,
    amount DECIMAL(10,2),
    region VARCHAR(50)
)
DISTSTYLE KEY
DISTKEY (customer_id)
COMPOUND SORTKEY (sale_date, region);
```

```sql
-- Interleaved sort key example
-- Both sale_date and region get equal weight
-- Useful when queries filter on either column independently
CREATE TABLE sales_interleaved (
    sale_id BIGINT IDENTITY(1,1),
    customer_id INTEGER,
    product_id INTEGER,
    sale_date DATE,
    amount DECIMAL(10,2),
    region VARCHAR(50)
)
DISTSTYLE KEY
DISTKEY (customer_id)
INTERLEAVED SORTKEY (sale_date, region);
```

## Compound vs Interleaved: When to Use Which

Compound sort keys work best when your queries consistently filter on the same leading columns. Think of date-partitioned fact tables where almost every query includes a date range filter. The compound sort key on `sale_date` lets Redshift skip huge chunks of data.

Interleaved sort keys shine when you have ad-hoc queries that filter on different columns. However, they come with a significant maintenance cost - running `VACUUM REINDEX` takes much longer than a regular vacuum. For most workloads, compound sort keys are the better default choice.

## Checking Sort Key Effectiveness

You can see how well your sort keys are working by looking at the percentage of unsorted rows:

```sql
-- Check how many rows are unsorted in each table
-- High unsorted percentage means you need to run VACUUM
SELECT
    "table" AS tablename,
    unsorted AS unsorted_pct,
    tbl_rows AS total_rows
FROM svv_table_info
WHERE schema = 'public'
ORDER BY unsorted DESC;
```

If the unsorted percentage is high, run a `VACUUM SORT ONLY` to re-sort the data:

```sql
-- Re-sort the table without reclaiming deleted row space
VACUUM SORT ONLY sales;

-- Or do a full vacuum that sorts and reclaims space
VACUUM FULL sales;
```

## Common Mistakes to Avoid

**Mistake 1: Using a low-cardinality column as DISTKEY.** If you distribute on a column with only 5 distinct values and you have 10 slices, some slices will be idle. Always check the cardinality before choosing a distribution key.

**Mistake 2: Not matching distribution keys on join tables.** If `sales` is distributed on `customer_id` but `orders` is distributed on `order_id`, joining them on `customer_id` forces a redistribution. Match the distribution key to your most common join column.

**Mistake 3: Using interleaved sort keys on tables with frequent loads.** Interleaved sort keys add overhead to loading and vacuuming, and `VACUUM REINDEX` takes much longer than a regular vacuum when you need to reanalyze interleaved sort key distribution. Stick with compound sort keys for tables with regular data loads.

**Mistake 4: Forgetting about sort maintenance.** Redshift automatically sorts table data in the background, which reduces the need to run `VACUUM` manually. If you need data fully sorted after a large load, though, you can still run `VACUUM` to maintain sort key effectiveness.

## A Practical Strategy

Here's a workflow I'd recommend for any Redshift table optimization:

1. Identify your most common queries and their JOIN and WHERE conditions
2. Pick the most frequent join column as the DISTKEY
3. Pick the most common filter column as the leading sort key
4. Load your data and check skew with `svv_table_info`
5. Run `EXPLAIN` on your top queries and look for `DS_BCAST` or `DS_DIST` steps - those indicate data redistribution
6. Monitor with `svl_query_summary` to see actual data movement

```sql
-- Find queries with the most data redistribution
-- High bytes values in redistribution steps indicate poor key choices
SELECT
    query,
    step,
    label,
    rows,
    bytes
FROM svl_query_summary
WHERE label LIKE '%dist%' OR label LIKE '%bcast%'
ORDER BY bytes DESC
LIMIT 20;
```

Getting distribution and sort keys right isn't a one-time task. As your query patterns evolve, you should revisit these settings. Redshift's `AUTO` distribution style is getting smarter over time, but for critical tables with known access patterns, manual tuning still wins.

For more on monitoring your data infrastructure, check out how to set up proper [observability for your AWS services](https://oneuptime.com/blog/post/2026-02-12-monitor-kinesis-data-streams-cloudwatch/view).
