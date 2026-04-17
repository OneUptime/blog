# How to Bulk Insert Pandas DataFrames into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pandas, Python, Bulk Insert, Data Engineering

Description: Learn efficient techniques for bulk inserting Pandas DataFrames into ClickHouse using clickhouse-connect, handling type conversion and batching for optimal performance.

---

## Why Bulk Insert Matters

Inserting a DataFrame row by row is catastrophically slow. ClickHouse is designed for bulk writes - each INSERT creates a part on disk, so sending many small inserts creates thousands of tiny parts. Bulk insert loads all rows in a single operation, creating one part.

## Setup

```bash
pip install clickhouse-connect pandas pyarrow
```

PyArrow is optional - only needed if you want to use `insert_arrow` for Arrow-based transfers.

## Basic DataFrame Insert

```python
import pandas as pd
import clickhouse_connect

client = clickhouse_connect.get_client(
    host="localhost", port=8123,
    username="default", password=""
)

df = pd.DataFrame({
    "user_id": [1, 2, 3, 4, 5],
    "event_time": pd.to_datetime(["2024-01-01 10:00:00"] * 5),
    "event_type": ["login", "click", "purchase", "logout", "login"],
    "value": [0.0, 1.5, 99.99, 0.0, 0.0]
})

client.insert_df("events", df)
```

## Type Mapping

ClickHouse and Pandas types do not always align. Common mappings:

| Pandas Type | ClickHouse Type |
|---|---|
| int64 | Int64 or UInt64 |
| float64 | Float64 |
| object (string) | String |
| datetime64[ns] | DateTime64(9) |
| bool | UInt8 |
| category | LowCardinality(String) |

Ensure types match before inserting to avoid silent truncation:

```python
df["user_id"] = df["user_id"].astype("uint64")
df["event_time"] = pd.to_datetime(df["event_time"])
```

## Batching Large DataFrames

For very large DataFrames (millions of rows), insert in chunks to avoid memory spikes:

```python
def insert_in_chunks(client, table, df, chunk_size=500_000):
    total = len(df)
    for start in range(0, total, chunk_size):
        chunk = df.iloc[start:start + chunk_size]
        client.insert_df(table, chunk)
        print(f"Inserted rows {start} - {min(start + chunk_size, total)} / {total}")

insert_in_chunks(client, "events", large_df)
```

## Using Arrow for Maximum Performance

If your data is already in Arrow format, you can send it directly to ClickHouse using `insert_arrow`, which uses the raw Arrow format on the wire and avoids a pandas-to-native conversion step:

```python
import pyarrow as pa

arrow_table = pa.Table.from_pandas(df)
client.insert_arrow("events", arrow_table)
```

This is useful when data originates from an Arrow-native source (e.g. Parquet files read via PyArrow), since it skips Python-level serialization and sends a columnar binary buffer directly.

## Handling NULL Values

ClickHouse Nullable columns accept Python `None` and Pandas `NaN`:

```python
df["optional_field"] = df["optional_field"].where(df["optional_field"].notna(), None)
```

Ensure the ClickHouse column is declared `Nullable(String)` or similar.

## Verifying the Insert

```python
result = client.query("SELECT count() FROM events")
print(f"Row count: {result.first_row[0]}")
```

## Summary

Bulk inserting Pandas DataFrames into ClickHouse is most efficient with `clickhouse-connect`'s `insert_df` method, which uses ClickHouse's native binary format under the hood. For large DataFrames, chunk inserts keep memory usage bounded while maintaining high throughput. Always align Pandas dtypes with ClickHouse column types before inserting.
