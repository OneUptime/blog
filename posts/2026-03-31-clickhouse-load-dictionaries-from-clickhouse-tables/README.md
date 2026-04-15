# How to Load Dictionaries from ClickHouse Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, ClickHouse Source, Lookup, Enrichment

Description: Learn how to load ClickHouse dictionaries directly from ClickHouse tables on the same or a remote server for fast in-memory lookups.

---

## ClickHouse as a Dictionary Source

The most natural source for a ClickHouse dictionary is another ClickHouse table. This is useful for maintaining reference or dimension tables in ClickHouse and using them to enrich fact tables at query time.

## Dictionary from a Local Table

```sql
-- Reference data table
CREATE TABLE product_dimensions (
    product_id UInt64,
    product_name String,
    category LowCardinality(String),
    brand String,
    unit_cost Float64
) ENGINE = MergeTree() ORDER BY product_id;

INSERT INTO product_dimensions VALUES
(1001, 'Widget Pro', 'Electronics', 'Acme', 12.50),
(1002, 'Gadget Lite', 'Electronics', 'TechCo', 8.75),
(1003, 'Tool Kit', 'Hardware', 'BuildRight', 45.00);

-- Create dictionary from this table
CREATE DICTIONARY product_dim_dict (
    product_id UInt64,
    product_name String DEFAULT '',
    category String DEFAULT 'Unknown',
    brand String DEFAULT '',
    unit_cost Float64 DEFAULT 0.0
)
PRIMARY KEY product_id
SOURCE(CLICKHOUSE(TABLE 'product_dimensions' DB 'default'))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);
```

## Dictionary from a Remote ClickHouse Server

```sql
CREATE DICTIONARY remote_user_dict (
    user_id UInt64,
    display_name String DEFAULT '',
    tier String DEFAULT 'free'
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(
    HOST 'clickhouse-analytics.internal'
    PORT 9000
    USER 'dict_reader'
    PASSWORD 'secret'
    DB 'users'
    TABLE 'user_profiles'
))
LAYOUT(HASHED())
LIFETIME(600);
```

## Dictionary with WHERE and Custom QUERY

Filter or transform the source data:

```sql
CREATE DICTIONARY active_product_dict (
    product_id UInt64,
    product_name String DEFAULT '',
    category String DEFAULT ''
)
PRIMARY KEY product_id
SOURCE(CLICKHOUSE(
    DB 'default'
    QUERY 'SELECT product_id, product_name, category FROM product_dimensions WHERE unit_cost > 0 AND product_name != '''''
))
LAYOUT(HASHED())
LIFETIME(300);
```

## Using the Dictionary in Analytical Queries

```sql
SELECT
    toDate(sale_time) AS day,
    dictGet('product_dim_dict', 'category', product_id) AS category,
    dictGet('product_dim_dict', 'brand', product_id) AS brand,
    sum(quantity) AS units_sold,
    sum(revenue) AS total_revenue
FROM sales_facts
WHERE sale_time >= now() - INTERVAL 30 DAY
GROUP BY day, category, brand
ORDER BY day DESC, total_revenue DESC;
```

## Verify Dictionary Loaded Correctly

```sql
SELECT
    name,
    status,
    element_count,
    formatReadableSize(bytes_allocated) AS memory,
    last_successful_update_time
FROM system.dictionaries
WHERE name = 'product_dim_dict';
```

## Flat Layout for Dense Integer Keys

If product IDs are sequential and small:

```sql
LAYOUT(FLAT())
```

## Use dictGetOrDefault for Missing Keys

```sql
SELECT
    sale_id,
    product_id,
    dictGetOrDefault('product_dim_dict', 'category', product_id, 'Uncategorized') AS category
FROM sales_facts
LIMIT 100;
```

## Reload the Dictionary After Source Table Updates

```sql
SYSTEM RELOAD DICTIONARY product_dim_dict;
```

Or let the `LIFETIME` interval handle automatic refreshes.

## Summary

Loading ClickHouse dictionaries from ClickHouse tables is the most efficient approach for analytics workflows. It avoids cross-system connections, benefits from ClickHouse's fast columnar reads, and allows filtering and transforming the source data using SQL before loading into the dictionary layout.
