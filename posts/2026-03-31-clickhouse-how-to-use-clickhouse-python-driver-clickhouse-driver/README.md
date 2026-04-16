# How to Use ClickHouse Python Driver (clickhouse-driver)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Python, Driver, Client, Database

Description: Learn how to connect to ClickHouse from Python using the clickhouse-driver library, execute queries, insert data, and use streaming for large result sets.

---

## Installing clickhouse-driver

```bash
pip install clickhouse-driver
```

For NumPy/Pandas support:

```bash
pip install clickhouse-driver[numpy]
```

## Connecting to ClickHouse

```python
from clickhouse_driver import Client

# Basic connection
client = Client(host='localhost', port=9000)

# With authentication
client = Client(
    host='localhost',
    port=9000,
    user='default',
    password='your_password',
    database='my_db'
)

# With SSL
client = Client(
    host='your-clickhouse-host',
    port=9440,
    user='default',
    password='your_password',
    secure=True,
    verify=True,
    ca_certs='/path/to/ca-certificates.crt'
)
```

## Executing Queries

```python
from clickhouse_driver import Client

client = Client(host='localhost')

# Simple query
result = client.execute('SELECT count() FROM system.tables')
print(result)  # [(123,)]

# Query with parameters (safe from injection)
result = client.execute(
    'SELECT * FROM events WHERE event_type = %(event_type)s LIMIT 10',
    {'event_type': 'click'}
)
for row in result:
    print(row)
```

## Inserting Data

```python
from clickhouse_driver import Client
from datetime import datetime

client = Client(host='localhost')

# Create table
client.execute('''
    CREATE TABLE IF NOT EXISTS user_events (
        user_id    UInt64,
        event_type String,
        ts         DateTime
    ) ENGINE = MergeTree()
    ORDER BY (user_id, ts)
''')

# Insert rows as list of tuples
rows = [
    (1001, 'login', datetime(2026, 3, 31, 10, 0, 0)),
    (1002, 'purchase', datetime(2026, 3, 31, 10, 1, 0)),
    (1003, 'logout', datetime(2026, 3, 31, 10, 5, 0)),
]

client.execute(
    'INSERT INTO user_events (user_id, event_type, ts) VALUES',
    rows
)
print(f"Inserted {len(rows)} rows")
```

## Bulk Insert with Batching

```python
from clickhouse_driver import Client

client = Client(host='localhost')

def insert_batch(rows, batch_size=10000):
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        client.execute(
            'INSERT INTO user_events VALUES',
            batch
        )
        print(f"Inserted batch ending at row {i + len(batch)}")

# Generate sample data
import random
from datetime import datetime, timedelta

data = []
for i in range(100000):
    data.append((
        random.randint(1, 10000),
        random.choice(['login', 'click', 'purchase', 'logout']),
        datetime.now() - timedelta(seconds=random.randint(0, 86400))
    ))

insert_batch(data)
```

## Streaming Large Result Sets

```python
from clickhouse_driver import Client

client = Client(host='localhost')

# Use execute_iter for streaming large results
rows = client.execute_iter('SELECT * FROM large_table LIMIT 1000000')
for row in rows:
    process_row(row)  # Process one row at a time
```

## Working with Settings

```python
from clickhouse_driver import Client

client = Client(host='localhost')

# Pass settings per query
result = client.execute(
    'SELECT count() FROM events',
    settings={
        'max_execution_time': 30,
        'max_memory_usage': 10000000000,
    }
)
```

## Using with Pandas

```python
from clickhouse_driver import Client
import pandas as pd

client = Client(host='localhost')

# Fetch as Pandas DataFrame
result, columns = client.execute(
    'SELECT user_id, count() AS events FROM user_events GROUP BY user_id',
    with_column_types=True
)

col_names = [col[0] for col in columns]
df = pd.DataFrame(result, columns=col_names)
print(df.head())
```

## Connection Pooling

```python
from clickhouse_driver import Client
from threading import local

_thread_local = local()

def get_client():
    if not hasattr(_thread_local, 'client'):
        _thread_local.client = Client(
            host='localhost',
            port=9000,
            user='default',
            password='secret'
        )
    return _thread_local.client
```

## Error Handling

```python
from clickhouse_driver import Client
from clickhouse_driver.errors import Error

client = Client(host='localhost')

try:
    result = client.execute('SELECT * FROM non_existent_table')
except Error as e:
    print(f"ClickHouse error: {e}")
except Exception as e:
    print(f"Connection error: {e}")
```

## Summary

The `clickhouse-driver` library provides a native Python interface to ClickHouse using the binary protocol on port 9000. Use parameterized queries to avoid SQL injection, `execute_iter` for streaming large results, and batch inserts with a reasonable batch size (10k-100k rows) for high-throughput ingestion. The library also supports NumPy arrays and Pandas DataFrames for data science workloads.
