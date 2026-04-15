# How to Use Npy Format for NumPy Integration with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Format, Npy, NumPy, Python, MachineLearning

Description: Learn how to use the Npy format in ClickHouse to export single-column numeric data directly into NumPy .npy files for ML and scientific computing.

---

ClickHouse's `Npy` format outputs a single column as a NumPy `.npy` binary file. This lets you load query results directly into NumPy arrays without any CSV parsing, type conversion, or intermediate serialization. It is designed for machine learning feature pipelines and scientific computing workflows where ClickHouse acts as the feature store.

## What the Npy Format Supports

- Single-column SELECT queries only.
- Supported column types: `UInt8`, `UInt16`, `UInt32`, `UInt64`, `Int8`, `Int16`, `Int32`, `Int64`, `Float32`, `Float64`, `String`, `FixedString`.
- The output is a valid NumPy `.npy` file with the appropriate dtype header.

```mermaid
flowchart LR
    A[ClickHouse numeric column] --> B[FORMAT Npy]
    B --> C[.npy binary file]
    C --> D[numpy.load - instant array]
    D --> E[ML model or computation]
```

## Exporting a Column to a .npy File

```sql
-- Export a Float64 column as a .npy file
SELECT score
FROM model_features
WHERE partition_date = today()
FORMAT Npy;
```

From the CLI, redirect to a file:

```bash
clickhouse-client \
  --query "SELECT score FROM model_features WHERE partition_date = today() FORMAT Npy" \
  > /tmp/scores.npy
```

## Loading the .npy File in Python

```python
import numpy as np

scores = np.load("/tmp/scores.npy")
print(scores.dtype)   # float64
print(scores.shape)   # (N,)
print(scores[:5])     # array([0.91, 0.43, 0.87, ...])
```

## Inserting Npy Data into ClickHouse

You can also insert a `.npy` file back into ClickHouse:

```sql
INSERT INTO model_scores (score) FORMAT Npy;
```

```bash
clickhouse-client \
  --query "INSERT INTO model_scores (score) FORMAT Npy" \
  < /tmp/scores.npy
```

The table must have at least one numeric column that matches the dtype stored in the `.npy` file.

## Creating a Suitable Table

```sql
CREATE TABLE model_features
(
    id          UInt64,
    partition_date Date,
    score       Float64,
    label       UInt8
)
ENGINE = MergeTree
ORDER BY (partition_date, id);
```

## Exporting Multiple Columns as Separate Arrays

Since `Npy` supports only one column at a time, export each feature column separately:

```bash
for col in score embedding_0 embedding_1; do
  clickhouse-client \
    --query "SELECT ${col} FROM model_features WHERE partition_date = today() FORMAT Npy" \
    > /tmp/${col}.npy
done
```

Then stack in Python:

```python
import numpy as np

score = np.load("/tmp/score.npy")
e0    = np.load("/tmp/embedding_0.npy")
e1    = np.load("/tmp/embedding_1.npy")

X = np.column_stack([score, e0, e1])
print(X.shape)  # (N, 3)
```

## Using the HTTP Interface

```bash
curl -s \
  "http://localhost:8123/?query=SELECT+score+FROM+model_features+LIMIT+10000+FORMAT+Npy" \
  --output /tmp/scores.npy
```

## Type Mapping

| ClickHouse type | NumPy dtype |
|---|---|
| `Float32` | `float32` |
| `Float64` | `float64` |
| `UInt8` | `uint8` |
| `UInt16` | `uint16` |
| `UInt32` | `uint32` |
| `UInt64` | `uint64` |
| `Int8` | `int8` |
| `Int16` | `int16` |
| `Int32` | `int32` |
| `Int64` | `int64` |
| `String` | `S` or `U` |
| `FixedString` | `S` |

## Performance Comparison

| Format | Parse overhead | Python load time (10M rows) |
|---|---|---|
| CSV | High | Slow |
| JSONEachRow | High | Slow |
| Arrow | Low | Fast |
| Npy | None | Fastest for single column |

For single numeric columns, `Npy` is the fastest path from ClickHouse to a Python computation because the binary dtype is preserved verbatim.

## Summary

The `Npy` format bridges ClickHouse and NumPy without any intermediate encoding. Use it when you need to export a single numeric column as a binary array for model training, feature engineering, or scientific analysis. For multi-column feature sets, export each column separately and stack them in Python with `np.column_stack`.
