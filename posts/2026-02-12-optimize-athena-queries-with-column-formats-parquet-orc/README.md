# How to Optimize Athena Queries with Column Formats (Parquet, ORC)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Athena, Parquet, ORC, Performance

Description: Understand how columnar file formats like Parquet and ORC dramatically improve Amazon Athena query performance and reduce costs compared to CSV and JSON.

---

The file format you use in S3 has an outsized impact on Athena's performance and cost. Switching from CSV to Parquet can reduce the amount of data scanned by 95% or more for typical analytical queries. That's not a typo. The format of your data is often the biggest factor in whether Athena feels fast or slow, cheap or expensive.

Let's dig into why columnar formats matter and how to use them effectively.

## Row vs. Column Storage

Traditional formats like CSV and JSON store data row by row:

```
Row 1: user_id=1, name="Alice", email="alice@example.com", age=30, city="NYC"
Row 2: user_id=2, name="Bob", email="bob@example.com", age=25, city="SF"
Row 3: user_id=3, name="Carol", email="carol@example.com", age=35, city="NYC"
```

If you only need the `name` and `city` columns, Athena still has to read every byte of every row to extract those two fields. All five columns get scanned.

Columnar formats like Parquet and ORC store data column by column:

```
Column: user_id -> [1, 2, 3]
Column: name -> ["Alice", "Bob", "Carol"]
Column: email -> ["alice@example.com", "bob@example.com", "carol@example.com"]
Column: age -> [30, 25, 35]
Column: city -> ["NYC", "SF", "NYC"]
```

Now when you query `SELECT name, city FROM users`, Athena reads only the `name` and `city` columns. The other three columns are completely skipped. That's 60% less data for this five-column table, and the savings get much larger with wider tables.

```mermaid
graph TD
    subgraph "CSV Query: SELECT name, city"
        A[Read ALL columns] --> B[Filter to 2 columns]
        B --> C["Data scanned: 100%"]
    end
    subgraph "Parquet Query: SELECT name, city"
        D[Read only name + city columns] --> E["Data scanned: ~40%"]
    end
```

## Parquet vs. ORC

Both are columnar, both are compressed, and both work great with Athena. Here's how they differ:

| Feature | Parquet | ORC |
|---------|---------|-----|
| Origin | Apache/Twitter | Apache/Hive |
| Compression | Snappy (default), GZIP, LZO, ZSTD | ZLIB (default), Snappy, LZO, ZSTD |
| Nested types | Excellent support | Good support |
| Ecosystem | Broad (Spark, Presto, pandas) | Strong in Hive ecosystem |
| Predicate pushdown | Yes | Yes |
| Stats/indexes | Column statistics | Stripe-level indexes + bloom filters |

**For most Athena use cases, Parquet is the better choice.** It has broader ecosystem support, works well with modern tools, and handles nested/complex types more naturally. ORC can be slightly better for highly filtered queries because of its built-in indexes.

## Converting Data to Parquet

### Using Athena CTAS

The simplest way to convert existing data to Parquet:

```sql
-- Convert CSV table to Parquet using CTAS
CREATE TABLE analytics.events_parquet
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-bucket/events-parquet/'
) AS
SELECT * FROM analytics.events_csv;
```

### Using Athena CTAS with Partitioning

Even better - convert to Parquet and partition at the same time:

```sql
-- Convert to partitioned Parquet in one step
CREATE TABLE analytics.events_optimized
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    partitioned_by = ARRAY['year', 'month'],
    external_location = 's3://my-bucket/events-optimized/'
) AS
SELECT
    event_id,
    event_type,
    user_id,
    payload,
    CAST(year(event_time) AS VARCHAR) as year,
    LPAD(CAST(month(event_time) AS VARCHAR), 2, '0') as month
FROM analytics.events_csv;
```

### Using Python with PyArrow

For data pipelines, generate Parquet files directly:

```python
# Convert a CSV file to Parquet using PyArrow
import pyarrow as pa
import pyarrow.parquet as pq
import pyarrow.csv as csv

# Read CSV
table = csv.read_csv('events.csv')

# Write as Parquet with Snappy compression
pq.write_table(
    table,
    'events.parquet',
    compression='snappy',
    row_group_size=128 * 1024 * 1024  # 128 MB row groups
)
```

### Using AWS Glue ETL

For large-scale conversions, use Glue ETL jobs:

```python
# Glue ETL script to convert JSON to Parquet
from awsglue.context import GlueContext
from pyspark.context import SparkContext

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

# Read from the Glue Data Catalog
source = glueContext.create_dynamic_frame.from_catalog(
    database="raw_data",
    table_name="events_json"
)

# Write as Parquet with compression
glueContext.write_dynamic_frame.from_options(
    frame=source,
    connection_type="s3",
    connection_options={
        "path": "s3://my-bucket/events-parquet/"
    },
    format="parquet",
    format_options={
        "compression": "snappy"
    }
)
```

For more on Glue ETL, see our guide on [creating AWS Glue ETL jobs](https://oneuptime.com/blog/post/2026-02-12-create-aws-glue-etl-jobs/view).

## Compression Options

Compression reduces file sizes further, on top of the columnar storage savings:

| Codec | Compression Ratio | Speed | Best For |
|-------|-------------------|-------|----------|
| Snappy | Good | Very fast | Most use cases (default for Parquet) |
| GZIP | Better | Slower | Storage-sensitive workloads |
| ZSTD | Better | Fast | Good balance of ratio and speed |
| LZO | Good | Fast | Splittable compression |

Snappy is the default for Parquet and is usually the right choice. It prioritizes decompression speed, which translates to faster queries. If storage cost is a bigger concern than query speed, try ZSTD or GZIP.

## Predicate Pushdown

Both Parquet and ORC store statistical metadata for each column - min value, max value, null count. Athena uses this for "predicate pushdown," which means it can skip entire row groups or stripes that can't possibly match your filter conditions.

For example, if a Parquet row group has `max(age) = 25` and your query says `WHERE age > 30`, Athena skips that entire row group without reading any data from it.

This works best when your data is sorted by the columns you frequently filter on:

```sql
-- Create a sorted Parquet table for better predicate pushdown
CREATE TABLE analytics.events_sorted
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-bucket/events-sorted/',
    bucketed_by = ARRAY['event_type'],
    bucket_count = 10
) AS
SELECT *
FROM analytics.events_raw
ORDER BY event_time;
```

## Real-World Performance Comparison

Here's a realistic example with a 100 GB dataset (uncompressed CSV) containing 20 columns:

| Format | Size on S3 | Query: SELECT 3 columns | Full scan |
|--------|-----------|------------------------|-----------|
| CSV (uncompressed) | 100 GB | 100 GB scanned, $0.50 | 100 GB, $0.50 |
| CSV (gzipped) | 25 GB | 25 GB scanned, $0.125 | 25 GB, $0.125 |
| Parquet (Snappy) | 15 GB | 2.5 GB scanned, $0.0125 | 15 GB, $0.075 |
| ORC (ZLIB) | 12 GB | 2.0 GB scanned, $0.01 | 12 GB, $0.06 |

The 3-column query on Parquet scans 40x less data than uncompressed CSV. At $5 per TB, that's a cost reduction from $0.50 to about $0.01 per query. Over thousands of queries per day, this adds up fast.

## File Size Optimization

Columnar formats work best with appropriately sized files. Too small and there's too much overhead from metadata and file opening. Too large and parallelism suffers.

**Target 128 MB to 1 GB per file** (compressed). This gives Athena enough data per file to be efficient while allowing good parallelism.

If you have thousands of tiny files, consolidate them:

```sql
-- Consolidate small files into larger ones using CTAS
CREATE TABLE analytics.events_consolidated
WITH (
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    external_location = 's3://my-bucket/events-consolidated/'
) AS
SELECT * FROM analytics.events_small_files;
```

CTAS naturally consolidates small files because it writes output in larger chunks.

## Defining Parquet Tables

When creating a table for Parquet data that already exists in S3:

```sql
-- Define a table pointing to existing Parquet data
CREATE EXTERNAL TABLE analytics.sales (
    transaction_id STRING,
    product_id STRING,
    customer_id STRING,
    quantity INT,
    unit_price DOUBLE,
    total_amount DOUBLE,
    transaction_time TIMESTAMP,
    store_id STRING,
    payment_method STRING
)
STORED AS PARQUET
LOCATION 's3://my-bucket/sales-parquet/';
```

You don't need to specify SerDe properties for Parquet or ORC - Athena handles them automatically.

For ORC:

```sql
-- Define a table for ORC data
CREATE EXTERNAL TABLE analytics.sales_orc (
    transaction_id STRING,
    product_id STRING,
    customer_id STRING,
    quantity INT,
    unit_price DOUBLE,
    total_amount DOUBLE,
    transaction_time TIMESTAMP,
    store_id STRING,
    payment_method STRING
)
STORED AS ORC
LOCATION 's3://my-bucket/sales-orc/';
```

## Monitoring Format Impact

Track the data scanned per query to see how format changes affect your costs:

```python
# Compare data scanned between CSV and Parquet tables for the same query
import boto3

athena = boto3.client('athena', region_name='us-east-1')

def run_and_measure(query, database='analytics'):
    """Run a query and return the data scanned in bytes."""
    response = athena.start_query_execution(
        QueryString=query,
        QueryExecutionContext={'Database': database},
        ResultConfiguration={'OutputLocation': 's3://my-results/'}
    )

    import time
    while True:
        result = athena.get_query_execution(
            QueryExecutionId=response['QueryExecutionId']
        )
        state = result['QueryExecution']['Status']['State']
        if state in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
            break
        time.sleep(1)

    if state == 'SUCCEEDED':
        scanned = result['QueryExecution']['Statistics']['DataScannedInBytes']
        print(f"Data scanned: {scanned / (1024**2):.1f} MB")
        return scanned
    return None

# Compare
print("CSV table:")
csv_bytes = run_and_measure("SELECT user_id, event_type, COUNT(*) FROM events_csv GROUP BY 1, 2")

print("\nParquet table:")
parquet_bytes = run_and_measure("SELECT user_id, event_type, COUNT(*) FROM events_parquet GROUP BY 1, 2")

if csv_bytes and parquet_bytes:
    reduction = (1 - parquet_bytes / csv_bytes) * 100
    print(f"\nReduction: {reduction:.1f}%")
```

## Wrapping Up

Switching to columnar formats is the second-highest-impact optimization you can make for Athena, right after [partitioning](https://oneuptime.com/blog/post/2026-02-12-optimize-athena-query-performance-with-partitioning/view). The combination of column pruning, compression, and predicate pushdown means your queries scan a fraction of the data they would with row-based formats.

Use Parquet as your default. Use Snappy compression unless you have a specific reason not to. Keep files between 128 MB and 1 GB. And never use `SELECT *` on a columnar table - you lose the entire benefit of column pruning.
