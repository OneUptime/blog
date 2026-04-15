# How to Handle Retries and Timeouts in ClickHouse Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Retry, Timeout, Resilience, Python

Description: Learn how to configure retries and timeouts in ClickHouse clients to build resilient applications that handle transient failures gracefully.

---

## Why Retries and Timeouts Matter

ClickHouse queries can fail due to network blips, server overload, or long-running queries. Configuring proper timeouts prevents hung threads and retries recover from transient errors without manual intervention.

## Timeout Settings in clickhouse-connect

```python
import clickhouse_connect

client = clickhouse_connect.get_client(
    host="localhost",
    port=8123,
    username="default",
    password="",
    connect_timeout=10,       # seconds to establish connection
    send_receive_timeout=60,  # seconds to wait for query response
    compress=True
)
```

## Server-Side Query Timeout

Set a max execution time per query on the server:

```python
client.command(
    "SELECT sleep(100)",
    settings={"max_execution_time": 30}
)
```

Or per session:

```sql
SET max_execution_time = 30;
```

## Retry with Tenacity

```bash
pip install tenacity
```

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import clickhouse_connect
from clickhouse_connect.driver.exceptions import OperationalError

client = clickhouse_connect.get_client(host="localhost")

@retry(
    retry=retry_if_exception_type(OperationalError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
def safe_query(sql):
    return client.query_df(sql)

df = safe_query("SELECT count() FROM events")
print(df)
```

## Custom Retry Logic

```python
import time

def query_with_retry(client, sql, retries=3, delay=2.0):
    for attempt in range(retries):
        try:
            return client.query_df(sql)
        except Exception as e:
            if attempt < retries - 1:
                print(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2
            else:
                raise
```

## Timeout Per Query

Override timeout for specific queries:

```python
result = client.query(
    "SELECT * FROM large_table LIMIT 1000000",
    settings={"max_execution_time": 120}
)
```

## Idempotent Inserts

ClickHouse ReplicatedMergeTree tables deduplicate inserts automatically based on block checksums. You can also provide an explicit `insert_deduplication_token` to control deduplication:

```python
client.insert(
    "events",
    data=rows,
    settings={"insert_deduplication_token": "batch-2026-01-01-001"}
)
```

## Circuit Breaker Pattern

```python
class CircuitBreaker:
    def __init__(self, max_failures=5, reset_timeout=60):
        self.failures = 0
        self.max_failures = max_failures
        self.reset_timeout = reset_timeout
        self.opened_at = None

    def call(self, fn, *args, **kwargs):
        if self.opened_at:
            if time.time() - self.opened_at < self.reset_timeout:
                raise RuntimeError("Circuit open - too many failures")
            self.failures = 0
            self.opened_at = None
        try:
            result = fn(*args, **kwargs)
            self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            if self.failures >= self.max_failures:
                self.opened_at = time.time()
            raise
```

## Summary

Reliable ClickHouse clients combine connect and query timeouts with retry logic using exponential backoff. Use `tenacity` for declarative retry policies, server-side `max_execution_time` to cap long queries, and idempotent inserts to safely retry failed writes.
