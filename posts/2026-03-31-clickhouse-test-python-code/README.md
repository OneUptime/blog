# How to Test Python Code That Uses ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Testing, Python, Pytest, Testcontainers

Description: Learn strategies for testing Python code that depends on ClickHouse, including mocking, testcontainers-based integration tests, and fixture patterns.

---

## Testing Strategies

There are three levels of testing for ClickHouse-dependent Python code:

1. Unit tests - mock the ClickHouse client to test business logic
2. Integration tests - use a real ClickHouse instance (via Docker/Testcontainers)
3. Contract tests - validate query results match expected schemas

## Unit Testing with Mocks

Mock the ClickHouse client when testing logic that depends on query results:

```python
# app.py
import clickhouse_connect

def get_daily_active_users(client, date: str) -> int:
    result = client.query(
        f"SELECT uniq(user_id) FROM events WHERE toDate(event_time) = '{date}'"
    )
    return result.first_row[0]
```

```python
# test_app.py
from unittest.mock import MagicMock
from app import get_daily_active_users

def test_get_daily_active_users():
    mock_client = MagicMock()
    mock_result = MagicMock()
    mock_result.first_row = [42]
    mock_client.query.return_value = mock_result

    count = get_daily_active_users(mock_client, "2024-01-01")

    assert count == 42
    mock_client.query.assert_called_once()
    assert "2024-01-01" in mock_client.query.call_args[0][0]
```

## Integration Tests with Testcontainers

Use `testcontainers` to spin up a real ClickHouse instance per test session:

```bash
pip install testcontainers[clickhouse] clickhouse-connect pytest
```

```python
# conftest.py
import pytest
from testcontainers.clickhouse import ClickHouseContainer
import clickhouse_connect

@pytest.fixture(scope="session")
def clickhouse_container():
    with ClickHouseContainer("clickhouse/clickhouse-server:latest") as ch:
        yield ch

@pytest.fixture(scope="session")
def ch_client(clickhouse_container):
    client = clickhouse_connect.get_client(
        host=clickhouse_container.get_container_host_ip(),
        port=int(clickhouse_container.get_exposed_port(8123))
    )
    client.command("""
        CREATE TABLE events (
            user_id UInt64,
            event_time DateTime DEFAULT now(),
            event_type String
        ) ENGINE = MergeTree() ORDER BY (user_id, event_time)
    """)
    yield client
```

```python
# test_integration.py
def test_insert_and_query(ch_client):
    ch_client.insert("events", [[1, "login"], [2, "click"]],
                     column_names=["user_id", "event_type"])

    result = ch_client.query("SELECT count() FROM events")
    assert result.first_row[0] == 2
```

## Testing Materialized Views

```python
def test_materialized_view(ch_client):
    ch_client.command("""
        CREATE MATERIALIZED VIEW event_counts
        ENGINE = SummingMergeTree()
        ORDER BY event_type
        AS SELECT event_type, count() AS cnt FROM events GROUP BY event_type
    """)
    ch_client.insert("events", [[3, "login"]], column_names=["user_id", "event_type"])
    ch_client.command("OPTIMIZE TABLE event_counts FINAL")
    result = ch_client.query("SELECT cnt FROM event_counts WHERE event_type = 'login'")
    assert result.first_row[0] >= 1
```

## Summary

Test ClickHouse Python code at multiple levels: mock the client for fast unit tests of business logic, use Testcontainers for real integration tests with schema creation and data insertion, and test materialized views and aggregations with `OPTIMIZE ... FINAL` to force merge before asserting.
