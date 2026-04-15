# How to Use ClickHouse Python Client (clickhouse-driver)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Python, Client, Integration, Driver

Description: Learn how to connect to ClickHouse from Python using clickhouse-driver, including querying data, inserting rows in bulk, streaming large results, and configuring connections.

---

`clickhouse-driver` is a mature Python client for ClickHouse that uses the native binary protocol. It provides a simple, synchronous API for executing queries, inserting data, and streaming large result sets. For async workloads, `asynch` uses the same native protocol, while `aiochclient` provides an async client over the HTTP interface. This guide focuses on `clickhouse-driver` as the most widely used option.

## Installation

```bash
pip install clickhouse-driver
```

For LZ4 compression support (recommended for production):

```bash
pip install clickhouse-driver[lz4]
```

For all optional dependencies:

```bash
pip install clickhouse-driver[numpy,lz4,zstd]
```

## Basic Connection

```python
from clickhouse_driver import Client

client = Client(
    host='127.0.0.1',
    port=9000,
    database='default',
    user='default',
    password='',
    settings={'max_execution_time': 60},
    compression=True,
)

result = client.execute('SELECT version()')
print('ClickHouse version:', result[0][0])
```

## Connection with All Options

```python
client = Client(
    host='127.0.0.1',
    port=9000,
    database='default',
    user='default',
    password='secret',
    connect_timeout=10,
    send_receive_timeout=300,
    sync_request_timeout=5,
    compression=True,
    client_name='my-app',
    verify=True,
    settings={
        'max_execution_time': 300,
        'max_memory_usage': 10 * 1024 ** 3,
        'max_threads': 8,
    },
)
```

## Create a Table

```python
client.execute('''
    CREATE TABLE IF NOT EXISTS events (
        event_id   UUID,
        user_id    UInt64,
        event_name LowCardinality(String),
        created_at DateTime64(3, 'UTC'),
        amount     Nullable(Float64)
    )
    ENGINE = MergeTree()
    PARTITION BY toYYYYMM(created_at)
    ORDER BY (user_id, created_at)
''')
```

## Insert Data

```python
import uuid
from datetime import datetime, timezone

rows = [
    (uuid.uuid4(), 1001, 'purchase', datetime.now(timezone.utc), 49.99),
    (uuid.uuid4(), 1002, 'page_view', datetime.now(timezone.utc), None),
    (uuid.uuid4(), 1001, 'page_view', datetime.now(timezone.utc), None),
]

client.execute('INSERT INTO events VALUES', rows)
print(f'Inserted {len(rows)} rows')
```

## Parameterized Queries

```python
# Use %(name)s style parameter placeholders
result = client.execute(
    'SELECT count() FROM events WHERE user_id = %(uid)s AND event_name = %(name)s',
    {'uid': 1001, 'name': 'page_view'}
)
print('Count:', result[0][0])
```

## Query and Process Results

```python
rows = client.execute(
    '''
    SELECT
        user_id,
        event_name,
        count()       AS cnt,
        min(created_at) AS first_seen,
        max(created_at) AS last_seen
    FROM events
    WHERE created_at >= %(since)s
    GROUP BY user_id, event_name
    ORDER BY cnt DESC
    LIMIT 20
    ''',
    {'since': datetime(2024, 1, 1, tzinfo=timezone.utc)}
)

for user_id, event_name, cnt, first_seen, last_seen in rows:
    print(f'user={user_id} event={event_name} count={cnt}')
```

## Get Column Names with Results

```python
rows, columns = client.execute(
    'SELECT user_id, event_name, count() AS cnt FROM events GROUP BY user_id, event_name LIMIT 5',
    with_column_types=True
)

# columns is a list of (name, type) tuples
headers = [col[0] for col in columns]
print('Columns:', headers)

for row in rows:
    print(dict(zip(headers, row)))
```

## Stream Large Result Sets

For queries returning millions of rows, use `execute_iter` to avoid loading everything into memory:

```python
settings = {'max_block_size': 100000}

row_count = 0
for row in client.execute_iter(
    'SELECT event_id, user_id, event_name, created_at FROM events',
    settings=settings
):
    row_count += 1
    # process row here

print(f'Processed {row_count} rows')
```

## Bulk Insert with execute_iter Progress

```python
def generate_rows(n: int):
    for i in range(n):
        yield (
            uuid.uuid4(),
            i % 1000,
            'click',
            datetime.now(timezone.utc),
            float(i),
        )

# clickhouse-driver accepts a generator for memory-efficient bulk inserts
client.execute('INSERT INTO events VALUES', generate_rows(1_000_000))
print('Inserted 1,000,000 rows')
```

## Return Results as NumPy Arrays

```python
import numpy as np

result = client.execute(
    'SELECT user_id, amount FROM events WHERE amount IS NOT NULL LIMIT 10000',
    columnar=True
)
# result is a list of arrays, one per column
user_ids = np.array(result[0])
amounts  = np.array(result[1])
print(f'Mean amount: {amounts.mean():.2f}')
```

## Return Results as a Pandas DataFrame

```python
import pandas as pd

result, columns = client.execute(
    '''
    SELECT
        toDate(created_at) AS day,
        count()            AS events,
        countIf(event_name = 'purchase') AS purchases
    FROM events
    GROUP BY day
    ORDER BY day
    ''',
    with_column_types=True
)

df = pd.DataFrame(result, columns=[c[0] for c in columns])
df['day'] = pd.to_datetime(df['day'])
print(df.head())
```

## Use a Context Manager

```python
from clickhouse_driver import Client

with Client('127.0.0.1') as client:
    result = client.execute('SELECT count() FROM events')
    print(result)
# Connection is closed automatically
```

## Error Handling

```python
from clickhouse_driver.errors import Error, NetworkError, ServerException

try:
    result = client.execute('SELECT * FROM nonexistent_table')
except ServerException as e:
    print(f'ClickHouse error {e.code}: {e.message}')
except NetworkError as e:
    print(f'Network error: {e}')
except Error as e:
    print(f'Driver error: {e}')
```

## Use Connection Pooling with a Pool Library

`clickhouse-driver` connections are not thread-safe. Use a connection pool in multithreaded applications:

```python
from clickhouse_pool import ChPool

pool = ChPool(
    host='127.0.0.1',
    port=9000,
    database='default',
    user='default',
    password='',
    connections_min=2,
    connections_max=10,
)

with pool.get_client() as client:
    result = client.execute('SELECT count() FROM events')
    print(result)
```

Install the pool library:

```bash
pip install clickhouse-pool
```

## Run a DDL Statement

```python
# DDL statements return an empty list on success
result = client.execute('DROP TABLE IF EXISTS events_temp')
print('DDL executed, result:', result)
```

## Insert Settings Per Statement

```python
client.execute(
    'INSERT INTO events VALUES',
    rows,
    settings={
        'async_insert': 1,
        'wait_for_async_insert': 0,
    }
)
```

## Common Pitfalls

- `clickhouse-driver` uses blocking I/O. Use `asynch` or `aiochclient` for async applications built with `asyncio`.
- Pass Python `datetime` objects with timezone information (`tzinfo=timezone.utc`) when inserting into `DateTime64` columns with a timezone. Naive datetimes are treated as local time, which may differ from UTC.
- For `Nullable` columns, pass Python `None`. Do not pass empty strings for nullable numeric columns.
- The `compression=True` option enables LZ4 compression on the wire, which significantly reduces bandwidth but requires the `lz4` package.

## Summary

`clickhouse-driver` provides a clean, Pythonic API for ClickHouse with support for parameterized queries, streaming, NumPy/Pandas integration, and bulk inserts via generators. Use `execute_iter` for large result sets, generators for memory-efficient bulk inserts, and the `with_column_types=True` flag when you need column metadata alongside results.
