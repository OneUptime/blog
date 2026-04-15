# How to Use ClickHouse with Pandas DataFrames

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pandas, Python, DataFrame, Analytics

Description: Learn how to read from and write to ClickHouse using Pandas DataFrames with clickhouse-connect for fast analytics data processing.

---

## Why Pandas and ClickHouse

Pandas DataFrames are ideal for local data exploration and transformation. ClickHouse stores and queries billions of rows efficiently. Combining both lets you query large datasets at ClickHouse speed and process results locally with Pandas.

## Install Dependencies

```bash
pip install clickhouse-connect pandas
```

## Connect to ClickHouse

```python
import clickhouse_connect

client = clickhouse_connect.get_client(
    host="localhost",
    port=8123,
    username="default",
    password=""
)
```

## Query to DataFrame

```python
df = client.query_df("SELECT * FROM events WHERE event_type = 'click' LIMIT 10000")
print(df.head())
print(df.dtypes)
```

## Aggregation Query to DataFrame

```python
df = client.query_df("""
    SELECT
        toDate(ts) AS day,
        event_type,
        count() AS cnt,
        avg(value) AS avg_value
    FROM events
    GROUP BY day, event_type
    ORDER BY day
""")
print(df.describe())
```

## Insert DataFrame to ClickHouse

```python
import pandas as pd

df = pd.DataFrame({
    "event_id": ["e1", "e2", "e3"],
    "user_id": ["u1", "u1", "u2"],
    "event_type": ["click", "view", "click"],
    "ts": pd.to_datetime(["2026-01-01", "2026-01-01", "2026-01-02"]),
    "value": [1.0, 2.5, 0.5]
})

client.insert_df("events", df)
```

## Chunked Reads for Large Datasets

```python
query = "SELECT * FROM large_events WHERE ts >= '2026-01-01'"

with client.query_df_stream(query) as stream:
    chunks = []
    for df_block in stream:
        chunks.append(df_block)
    df = pd.concat(chunks, ignore_index=True)
```

## Type Mapping Tips

ClickHouse types map to Pandas automatically:

```text
UInt64, Int64  -> int64
Float64        -> float64
String         -> object
DateTime       -> datetime64[ns]
Date           -> datetime64[ns]
Nullable(T)    -> nullable dtypes (with pd.NA, when use_extended_dtypes=True)
```

## Transforming and Writing Back

```python
df["value_normalized"] = (df["value"] - df["value"].mean()) / df["value"].std()
df_out = df[["event_id", "value_normalized"]]
client.insert_df("events_normalized", df_out)
```

## Performance Tips

- Use `LIMIT` during exploration before loading full datasets
- Select only required columns to reduce transfer size
- Use ClickHouse aggregations where possible instead of Pandas

```sql
SELECT user_id, sum(value) AS total FROM events GROUP BY user_id
```

## Summary

ClickHouse and Pandas work well together: ClickHouse handles large-scale aggregation and storage while Pandas handles local analysis. The `clickhouse-connect` library provides direct DataFrame read and write support, making the integration straightforward and efficient.
