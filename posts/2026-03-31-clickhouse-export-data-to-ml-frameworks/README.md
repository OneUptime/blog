# How to Export ClickHouse Data to ML Frameworks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Machine Learning, Export, Pandas, PyTorch, Parquet, Data Engineering

Description: Learn how to export ClickHouse query results to ML frameworks like Pandas, PyTorch, and scikit-learn for model training and evaluation.

---

Once features are computed in ClickHouse, you need to get them into Python ML frameworks efficiently. This post covers multiple export patterns - from in-memory DataFrames to file-based Parquet exports - for various ML pipeline scenarios.

## Exporting to Pandas

The fastest way to move data from ClickHouse into a Pandas DataFrame:

```python
import clickhouse_connect
import pandas as pd

client = clickhouse_connect.get_client(host='localhost', database='default')

df = client.query_df("""
    SELECT
        user_id,
        total_events,
        purchases,
        conversion_rate,
        sessions,
        label
    FROM ml_features
    WHERE split = 'train'
    LIMIT 1000000
""")

print(df.shape)
print(df.dtypes)
```

The `clickhouse-connect` library's `query_df` builds a pandas DataFrame column-wise from ClickHouse's Native format, which is significantly faster than row-by-row fetching. For a PyArrow-backed DataFrame, use `query_df_arrow` instead.

## Exporting to Parquet via ClickHouse

For large datasets, export directly to Parquet files:

```sql
SELECT
    user_id,
    total_events,
    conversion_rate,
    label
FROM ml_features
WHERE split = 'train'
INTO OUTFILE '/exports/training_data.parquet'
FORMAT Parquet;
```

Then load in Python:

```python
import pandas as pd

df = pd.read_parquet('/exports/training_data.parquet')
```

## Streaming Data into PyTorch

For datasets too large to fit in memory, use a streaming ClickHouse reader:

```python
import torch
from torch.utils.data import IterableDataset
import clickhouse_connect

class ClickHouseDataset(IterableDataset):
    def __init__(self, query, feature_cols, label_col):
        self.query = query
        self.feature_cols = feature_cols
        self.label_col = label_col

    def __iter__(self):
        client = clickhouse_connect.get_client(host='localhost')
        with client.query_rows_stream(self.query) as stream:
            for row in stream:
                features = torch.tensor(
                    [row[self.feature_cols.index(c)] for c in self.feature_cols],
                    dtype=torch.float32
                )
                label = torch.tensor(row[-1], dtype=torch.float32)
                yield features, label

dataset = ClickHouseDataset(
    query="SELECT total_events, sessions, conversion_rate, label FROM ml_features",
    feature_cols=['total_events', 'sessions', 'conversion_rate'],
    label_col='label'
)

loader = torch.utils.data.DataLoader(dataset, batch_size=256)
```

## Exporting to NumPy Arrays

For scikit-learn models:

```python
import numpy as np
import clickhouse_connect

client = clickhouse_connect.get_client(host='localhost')

result = client.query("""
    SELECT total_events, sessions, conversion_rate, label
    FROM ml_features
    WHERE split = 'train'
""")

data = np.array(result.result_rows, dtype=np.float32)
X = data[:, :-1]
y = data[:, -1]

from sklearn.ensemble import RandomForestClassifier
model = RandomForestClassifier(n_estimators=100)
model.fit(X, y)
```

## Writing Predictions Back to ClickHouse

After inference, write predictions back for monitoring:

```python
predictions = model.predict_proba(X_test)[:, 1]

rows = list(zip(user_ids, predictions.tolist()))
client.insert('model_predictions',
              rows,
              column_names=['user_id', 'score'])
```

## Using Arrow for Zero-Copy Transfer

```python
result = client.query_arrow("SELECT * FROM ml_features LIMIT 100000")
# Convert to pandas without copying data
df = result.to_pandas()
```

## Summary

ClickHouse integrates cleanly with ML frameworks through `clickhouse-connect`'s Arrow-backed DataFrame API, direct Parquet file exports, and streaming row iterators for large datasets. Write predictions back to ClickHouse to enable model monitoring and feedback loops alongside your operational data.
