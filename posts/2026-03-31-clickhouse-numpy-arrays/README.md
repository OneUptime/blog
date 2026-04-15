# How to Use ClickHouse with NumPy Arrays

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NumPy, Python, Array, Data Science

Description: Learn how to load ClickHouse query results into NumPy arrays for numerical computing, and how to insert NumPy arrays back into ClickHouse efficiently.

---

## When to Use NumPy with ClickHouse

ClickHouse excels at aggregation and filtering. NumPy excels at matrix operations, statistical computations, and signal processing. A common pattern is: run aggregation in ClickHouse, load results into NumPy, apply mathematical transformations, write results back.

## Setup

```bash
pip install clickhouse-connect numpy pyarrow
```

## Reading ClickHouse Results into NumPy

```python
import numpy as np
import clickhouse_connect

client = clickhouse_connect.get_client(host="localhost", port=8123)

# Query numerical data
result = client.query(
    "SELECT user_id, value, response_time_ms FROM metrics LIMIT 500000"
)

# Convert to numpy arrays directly
user_ids = np.array(result.result_columns[0], dtype=np.uint64)
values = np.array(result.result_columns[1], dtype=np.float64)
response_times = np.array(result.result_columns[2], dtype=np.float32)
```

## Via PyArrow for Efficiency

For large result sets, the Arrow pathway is faster:

```python
import pyarrow as pa

arrow_table = client.query_arrow(
    "SELECT ts, cpu_usage, memory_usage FROM system_metrics ORDER BY ts"
)

ts = arrow_table.column("ts").to_pylist()
cpu = arrow_table.column("cpu_usage").to_numpy()
mem = arrow_table.column("memory_usage").to_numpy()
```

## NumPy Analysis

```python
# Statistical summary
print(f"CPU - mean: {cpu.mean():.2f}%, p95: {np.percentile(cpu, 95):.2f}%")
print(f"Memory - mean: {mem.mean():.2f}%, max: {mem.max():.2f}%")

# Correlation
correlation = np.corrcoef(cpu, mem)[0, 1]
print(f"CPU-Memory correlation: {correlation:.3f}")

# Rolling average (manual with convolution)
window = 60
rolling_avg = np.convolve(cpu, np.ones(window) / window, mode="valid")
```

## Detecting Anomalies

```python
# Z-score anomaly detection
mean = response_times.mean()
std = response_times.std()
z_scores = (response_times - mean) / std
anomalies = np.where(np.abs(z_scores) > 3)[0]
print(f"Found {len(anomalies)} anomalies")
```

## Writing NumPy Arrays Back to ClickHouse

```python
# Create a structured array and insert
anomaly_times = np.array(ts)[anomalies]
anomaly_values = response_times[anomalies]

rows = list(zip(anomaly_times.tolist(), anomaly_values.tolist()))
client.insert(
    "anomalies",
    rows,
    column_names=["detected_at", "response_time_ms"]
)
```

## Handling Large Arrays with Chunks

```python
def insert_numpy_chunked(client, table, col_names, arrays, chunk_size=100_000):
    n = len(arrays[0])
    for start in range(0, n, chunk_size):
        slices = [arr[start:start + chunk_size] for arr in arrays]
        rows = list(zip(*[s.tolist() for s in slices]))
        client.insert(table, rows, column_names=col_names)
```

## Summary

ClickHouse integrates with NumPy via direct column extraction or the Arrow pathway. Run aggregations in ClickHouse SQL, pull numerical columns as NumPy arrays, apply vectorized statistical operations, and write computed results back with chunked inserts. This keeps heavy math in NumPy while delegating data filtering and aggregation to ClickHouse.
