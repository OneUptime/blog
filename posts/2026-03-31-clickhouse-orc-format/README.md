# How to Use ORC Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ORC, Data Engineering, Analytics

Description: Learn how to read and write ORC files in ClickHouse, with examples for schema inspection, S3 integration, type mapping, and compression options.

## What Is ORC?

Optimized Row Columnar (ORC) is a columnar file format developed for the Apache Hive ecosystem. Like Parquet, it stores data in columns and supports predicate pushdown and compression. ORC is the default format for many Hive and Presto workloads, and ClickHouse supports reading and writing it natively.

ORC features:
- Built-in lightweight indexes (min/max, bloom filters per stripe)
- Efficient compression with Zlib, Snappy, LZ4, or ZSTD
- Strong support for complex types (lists, maps, structs)
- ACID semantics for transactional Hive tables

## Reading an ORC File

Query an ORC file directly without importing:

```sql
SELECT *
FROM file('sales.orc', ORC)
LIMIT 10;
```

Inspect the inferred schema:

```sql
DESCRIBE file('sales.orc', ORC);
```

## Loading ORC Data into a Table

Create a target table and insert from the ORC file:

```sql
CREATE TABLE sales
(
    sale_id    UInt64,
    product_id UInt32,
    store_id   UInt16,
    amount     Float64,
    sale_date  Date
)
ENGINE = MergeTree()
ORDER BY (sale_date, store_id);

INSERT INTO sales
SELECT *
FROM file('sales.orc', ORC);
```

## Writing Data to ORC

Export a query result to an ORC file:

```sql
SELECT
    store_id,
    sum(amount) AS revenue,
    count()     AS transactions
FROM sales
GROUP BY store_id
INTO OUTFILE 'store_revenue.orc'
FORMAT ORC;
```

Using `clickhouse-client` from the shell:

```bash
clickhouse-client \
  --query "SELECT * FROM sales FORMAT ORC" \
  > sales_export.orc
```

## Reading ORC Files from S3

ClickHouse can query ORC files directly on S3 without downloading them first:

```sql
SELECT
    product_id,
    sum(amount) AS total_revenue
FROM s3(
    'https://my-bucket.s3.amazonaws.com/sales/year=2025/**/*.orc',
    'ACCESS_KEY',
    'SECRET_KEY',
    'ORC'
)
GROUP BY product_id
ORDER BY total_revenue DESC
LIMIT 20;
```

## Type Mapping

| ClickHouse Type | ORC Type |
|-----------------|-----------|
| Int8 / UInt8    | Tinyint |
| Int16 / UInt16  | Smallint |
| Int32 / UInt32  | Int |
| Int64 / UInt64  | Bigint |
| Float32         | Float |
| Float64         | Double |
| Decimal         | Decimal |
| String          | String |
| Date32          | Date |
| DateTime64      | Timestamp |
| Array(T)        | List |
| Map(K, V)       | Map |
| Tuple           | Struct |

## Compression Codec

Control output compression via a setting:

```sql
SET output_format_orc_compression_method = 'zlib';

SELECT * FROM sales
INTO OUTFILE 'sales_compressed.orc'
FORMAT ORC;
```

Available methods: `none`, `zlib`, `snappy`, `lz4`, `zstd`.

## Row Index Stride

ORC stores a row index every N rows (called the stride). Smaller strides improve filter pushdown at the cost of more metadata. The default is 10000 rows per stride. You can adjust it:

```sql
SET output_format_orc_row_index_stride = 5000;
```

## Filtering with Stripe Statistics

ORC files contain min/max statistics per column per stripe. ClickHouse uses these to skip stripes when executing range filters. To benefit from this, sort your data before writing:

```sql
SELECT *
FROM sales
ORDER BY sale_date
INTO OUTFILE 'sales_sorted.orc'
FORMAT ORC;
```

When you later filter by `sale_date`, many stripes can be skipped entirely.

## Handling Complex Types

Read a file with a nested list column:

```sql
SELECT
    sale_id,
    arrayJoin(tags) AS tag
FROM file('sales_with_tags.orc', ORC)
WHERE tag = 'clearance';
```

Enable nested type import if the ORC file contains struct arrays (note: this setting is deprecated in newer ClickHouse versions):

```sql
SET input_format_orc_import_nested = 1;
```

## Performance Tips

1. **Sort before writing** ORC to maximize stripe-level skipping.
2. **Use Zlib or LZ4** depending on whether you prioritize compression ratio or speed.
3. **Partition S3 paths by date** and filter on the partition key in `WHERE` clauses to reduce files read.
4. **Prefer ORC over CSV** for large datasets - the binary format is significantly faster to parse.

## Conclusion

ORC is an excellent choice when you are operating in a Hive-centric data lake environment. ClickHouse's native ORC support means you can query Hive warehouse data directly without ETL pipelines, and export results that other Hive or Presto jobs can consume immediately.

**Related Reading:**

- [How to Use Parquet Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-parquet-format/view)
- [How to Use Arrow Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-arrow-format/view)
- [How to Import Data from S3 in Various Formats in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-import-from-s3/view)
