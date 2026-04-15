# How to Use ClickHouse with Polars DataFrames

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Polars, Python, DataFrame, Data Engineering

Description: Integrate ClickHouse with Polars for fast analytical workflows - read query results into Polars DataFrames and write Polars data back to ClickHouse efficiently.

---

## Why Polars with ClickHouse?

Polars is a Rust-based DataFrame library significantly faster than Pandas for in-memory transformations. When you need to pull data from ClickHouse, apply complex Python-side transformations, and write results back, Polars speeds up the middle step while Arrow-based transfer speeds up the I/O.

## Setup

```bash
pip install polars clickhouse-connect pyarrow
```

## Reading ClickHouse Results into Polars

`clickhouse-connect` can return results as Apache Arrow, which Polars reads natively with zero copy:

```python
import polars as pl
import clickhouse_connect

client = clickhouse_connect.get_client(host="localhost", port=8123)

# Get Arrow table from ClickHouse
arrow_table = client.query_arrow(
    "SELECT user_id, event_time, event_type, value FROM events LIMIT 1000000"
)

# Convert to Polars - zero copy from Arrow
df = pl.from_arrow(arrow_table)
print(df.schema)
print(df.head())
```

## Polars Transformations

```python
# Group by and aggregate in Polars
summary = (
    df
    .filter(pl.col("event_type") == "purchase")
    .group_by("user_id")
    .agg([
        pl.col("value").sum().alias("total_spent"),
        pl.col("event_time").count().alias("purchase_count")
    ])
    .sort("total_spent", descending=True)
)
```

## Writing Polars DataFrames Back to ClickHouse

Convert Polars to Arrow and insert:

```python
arrow_result = summary.to_arrow()
client.insert_arrow("user_summary", arrow_result)
```

Or convert to Pandas as an intermediate step if needed:

```python
pandas_df = summary.to_pandas()
client.insert_df("user_summary", pandas_df)
```

## Lazy Evaluation for Large Datasets

Use Polars LazyFrame to build query plans before executing:

```python
lazy = pl.from_arrow(arrow_table).lazy()

result = (
    lazy
    .filter(pl.col("value") > 0)
    .group_by("event_type")
    .agg(pl.col("value").mean().alias("avg_value"))
    .collect()  # execute only here
)
```

This lets Polars optimize the query plan before materializing results.

## Streaming Large Results

For datasets too large to fit in memory, use ClickHouse's streaming + Polars chunked processing:

```python
chunks = []
with client.query_arrow_stream(
    "SELECT * FROM events WHERE event_date = today()"
) as stream:
    for batch in stream:
        chunk_df = pl.from_arrow(batch)
        processed = chunk_df.filter(pl.col("value") > 100)
        chunks.append(processed)

final = pl.concat(chunks)
```

## Performance Comparison

For typical aggregation workloads on 10M rows:

```text
Pandas groupby:    ~3.2 seconds
Polars groupby:    ~0.4 seconds
ClickHouse SQL:    ~0.05 seconds
```

Use ClickHouse for aggregations when possible, Polars for post-processing transformations.

## Summary

ClickHouse and Polars integrate via Apache Arrow, enabling zero-copy transfers and fast in-memory transformations. Read large result sets with `query_arrow`, transform with Polars' Rust-powered operations, and write results back with `insert_arrow` for an end-to-end performant Python analytics pipeline.
