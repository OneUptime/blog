# How to Use ClickHouse with Jupyter Notebooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Jupyter, Python, Notebook, Analytics

Description: Learn how to connect and query ClickHouse from Jupyter Notebooks for interactive data exploration and visualization of large datasets.

---

## Why Jupyter with ClickHouse

Jupyter Notebooks are the standard environment for data exploration. Pairing them with ClickHouse lets you run fast analytical SQL queries and visualize billions of rows interactively without moving data to a slower store.

## Install Dependencies

```bash
pip install clickhouse-connect pandas matplotlib seaborn jupyter
```

## Connect in a Notebook Cell

```python
import clickhouse_connect

client = clickhouse_connect.get_client(
    host="localhost",
    port=8123,
    username="default",
    password=""
)
print("Connected:", client.server_version)
```

## Run a Query and Display Results

```python
import pandas as pd

df = client.query_df("""
    SELECT
        toDate(ts) AS day,
        count() AS events
    FROM events
    WHERE ts >= '2026-01-01'
    GROUP BY day
    ORDER BY day
""")
df.head(10)
```

## Visualize with Matplotlib

```python
import matplotlib.pyplot as plt

plt.figure(figsize=(12, 4))
plt.plot(df["day"], df["events"], marker="o")
plt.title("Daily Event Count")
plt.xlabel("Date")
plt.ylabel("Events")
plt.tight_layout()
plt.show()
```

## Interactive Charts with Seaborn

```python
import seaborn as sns

df2 = client.query_df("""
    SELECT event_type, count() AS cnt
    FROM events
    GROUP BY event_type
    ORDER BY cnt DESC
    LIMIT 10
""")

plt.figure(figsize=(10, 5))
sns.barplot(data=df2, x="event_type", y="cnt")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()
```

## Use Magic Commands with JupySQL

```bash
pip install jupysql sqlalchemy clickhouse-sqlalchemy
```

```python
%load_ext sql
%sql clickhouse+http://default:@localhost:8123/default
```

```python
%%sql
SELECT event_type, count() AS cnt
FROM events
GROUP BY event_type
ORDER BY cnt DESC
LIMIT 5
```

## Parameterized Queries

```python
event_type = "click"
start_date = "2026-01-01"

df = client.query_df(
    "SELECT * FROM events WHERE event_type = {type:String} AND ts >= {start:String}",
    parameters={"type": event_type, "start": start_date}
)
df.shape
```

## Save Output to CSV

```python
df.to_csv("output.csv", index=False)
print("Saved", len(df), "rows")
```

## Summary

Jupyter Notebooks with ClickHouse give you a powerful interactive analytics environment. Use `clickhouse-connect` for direct DataFrame queries, Matplotlib and Seaborn for visualization, and parameterized queries for safe dynamic filtering - all without leaving the notebook.
