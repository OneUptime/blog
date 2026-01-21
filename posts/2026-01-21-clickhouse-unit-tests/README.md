# How to Write Unit Tests for ClickHouse Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Testing, Unit Tests, SQL Testing, Quality Assurance, CI/CD

Description: A comprehensive guide to writing unit tests for ClickHouse queries, covering testing frameworks, materialized view validation, and CI/CD integration for reliable data pipelines.

---

Testing ClickHouse queries ensures data accuracy and prevents regressions. This guide covers strategies for unit testing SQL logic, materialized views, and data transformations in ClickHouse.

## Testing Strategies

### Test Categories

1. **Schema tests** - Validate table structures
2. **Query tests** - Verify SQL logic
3. **Materialized view tests** - Ensure correct aggregations
4. **Data quality tests** - Check constraints and expectations

## Python Testing Framework

### Setup with pytest

```python
# conftest.py
import pytest
import clickhouse_connect
import uuid

@pytest.fixture(scope="session")
def ch_client():
    """Create a ClickHouse client for testing"""
    client = clickhouse_connect.get_client(
        host='localhost',
        port=8123,
        username='default'
    )
    yield client
    client.close()

@pytest.fixture(scope="function")
def test_db(ch_client):
    """Create an isolated test database"""
    db_name = f"test_{uuid.uuid4().hex[:8]}"
    ch_client.command(f"CREATE DATABASE {db_name}")
    yield db_name
    ch_client.command(f"DROP DATABASE {db_name}")

@pytest.fixture
def events_table(ch_client, test_db):
    """Create a test events table"""
    ch_client.command(f"""
        CREATE TABLE {test_db}.events (
            event_id UUID DEFAULT generateUUIDv4(),
            timestamp DateTime DEFAULT now(),
            user_id UInt64,
            event_type String,
            revenue Decimal64(2)
        ) ENGINE = MergeTree()
        ORDER BY (user_id, timestamp)
    """)
    return f"{test_db}.events"
```

### Testing Query Logic

```python
# test_queries.py
import pytest
from decimal import Decimal

class TestEventQueries:

    def test_count_events_by_type(self, ch_client, events_table):
        """Test event counting by type"""
        # Insert test data
        ch_client.command(f"""
            INSERT INTO {events_table} (user_id, event_type, revenue)
            VALUES
                (1, 'page_view', 0),
                (1, 'page_view', 0),
                (2, 'purchase', 99.99),
                (2, 'page_view', 0)
        """)

        # Execute query under test
        result = ch_client.query(f"""
            SELECT
                event_type,
                count() as event_count
            FROM {events_table}
            GROUP BY event_type
            ORDER BY event_type
        """)

        # Assertions
        rows = result.result_rows
        assert len(rows) == 2
        assert rows[0] == ('page_view', 3)
        assert rows[1] == ('purchase', 1)

    def test_revenue_calculation(self, ch_client, events_table):
        """Test revenue aggregation"""
        ch_client.command(f"""
            INSERT INTO {events_table} (user_id, event_type, revenue)
            VALUES
                (1, 'purchase', 50.00),
                (1, 'purchase', 75.50),
                (2, 'purchase', 100.00)
        """)

        result = ch_client.query(f"""
            SELECT
                sum(revenue) as total_revenue,
                avg(revenue) as avg_revenue
            FROM {events_table}
            WHERE event_type = 'purchase'
        """)

        total, avg = result.result_rows[0]
        assert float(total) == pytest.approx(225.50)
        assert float(avg) == pytest.approx(75.17, rel=0.01)
```

### Testing Materialized Views

```python
# test_materialized_views.py
import time

class TestMaterializedViews:

    @pytest.fixture
    def mv_setup(self, ch_client, test_db):
        """Set up source table and materialized view"""
        # Source table
        ch_client.command(f"""
            CREATE TABLE {test_db}.events_source (
                timestamp DateTime,
                event_type String,
                user_id UInt64
            ) ENGINE = MergeTree()
            ORDER BY timestamp
        """)

        # Target table
        ch_client.command(f"""
            CREATE TABLE {test_db}.hourly_stats (
                hour DateTime,
                event_type String,
                event_count UInt64,
                unique_users UInt64
            ) ENGINE = SummingMergeTree()
            ORDER BY (hour, event_type)
        """)

        # Materialized view
        ch_client.command(f"""
            CREATE MATERIALIZED VIEW {test_db}.hourly_stats_mv
            TO {test_db}.hourly_stats
            AS SELECT
                toStartOfHour(timestamp) AS hour,
                event_type,
                count() AS event_count,
                uniq(user_id) AS unique_users
            FROM {test_db}.events_source
            GROUP BY hour, event_type
        """)

        return test_db

    def test_mv_aggregates_correctly(self, ch_client, mv_setup):
        """Test that MV aggregates data correctly"""
        db = mv_setup

        # Insert source data
        ch_client.command(f"""
            INSERT INTO {db}.events_source
            VALUES
                ('2024-01-15 10:15:00', 'click', 1),
                ('2024-01-15 10:30:00', 'click', 2),
                ('2024-01-15 10:45:00', 'click', 1),
                ('2024-01-15 11:15:00', 'click', 3)
        """)

        # Query the materialized view target
        result = ch_client.query(f"""
            SELECT hour, event_count, unique_users
            FROM {db}.hourly_stats
            ORDER BY hour
        """)

        rows = result.result_rows
        assert len(rows) == 2

        # Hour 10:00 - 3 events, 2 unique users
        assert rows[0][1] == 3  # event_count
        assert rows[0][2] == 2  # unique_users

        # Hour 11:00 - 1 event, 1 unique user
        assert rows[1][1] == 1
        assert rows[1][2] == 1
```

## Testing Data Transformations

```python
# test_transformations.py

class TestDataTransformations:

    def test_json_extraction(self, ch_client, test_db):
        """Test JSON parsing logic"""
        ch_client.command(f"""
            CREATE TABLE {test_db}.raw_events (
                id UInt64,
                data String
            ) ENGINE = Memory
        """)

        ch_client.command(f"""
            INSERT INTO {test_db}.raw_events VALUES
                (1, '{{"user": "alice", "action": "click"}}'),
                (2, '{{"user": "bob", "action": "view"}}')
        """)

        result = ch_client.query(f"""
            SELECT
                id,
                JSONExtractString(data, 'user') AS user,
                JSONExtractString(data, 'action') AS action
            FROM {test_db}.raw_events
            ORDER BY id
        """)

        rows = result.result_rows
        assert rows[0] == (1, 'alice', 'click')
        assert rows[1] == (2, 'bob', 'view')

    def test_array_operations(self, ch_client, test_db):
        """Test array transformations"""
        result = ch_client.query("""
            SELECT
                arrayMap(x -> x * 2, [1, 2, 3]) AS doubled,
                arrayFilter(x -> x > 2, [1, 2, 3, 4, 5]) AS filtered,
                arrayReduce('sum', [1, 2, 3, 4, 5]) AS sum
        """)

        row = result.result_rows[0]
        assert row[0] == (2, 4, 6)
        assert row[1] == (3, 4, 5)
        assert row[2] == 15
```

## Data Quality Tests

```python
# test_data_quality.py

class TestDataQuality:

    def test_no_null_required_fields(self, ch_client, events_table):
        """Ensure required fields are not null"""
        ch_client.command(f"""
            INSERT INTO {events_table} (user_id, event_type, revenue)
            VALUES (1, 'click', 0), (2, 'view', 0)
        """)

        result = ch_client.query(f"""
            SELECT count() as null_count
            FROM {events_table}
            WHERE user_id IS NULL OR event_type IS NULL
        """)

        assert result.result_rows[0][0] == 0

    def test_no_duplicate_events(self, ch_client, test_db):
        """Test deduplication logic"""
        ch_client.command(f"""
            CREATE TABLE {test_db}.events_dedup (
                event_id UUID,
                timestamp DateTime,
                user_id UInt64
            ) ENGINE = ReplacingMergeTree()
            ORDER BY event_id
        """)

        # Insert duplicates
        ch_client.command(f"""
            INSERT INTO {test_db}.events_dedup VALUES
                ('550e8400-e29b-41d4-a716-446655440000', now(), 1),
                ('550e8400-e29b-41d4-a716-446655440000', now(), 1)
        """)

        # Force merge
        ch_client.command(f"OPTIMIZE TABLE {test_db}.events_dedup FINAL")

        result = ch_client.query(f"""
            SELECT count() FROM {test_db}.events_dedup
        """)

        assert result.result_rows[0][0] == 1

    def test_referential_integrity(self, ch_client, test_db):
        """Test foreign key relationships"""
        # Create users table
        ch_client.command(f"""
            CREATE TABLE {test_db}.users (
                user_id UInt64,
                name String
            ) ENGINE = MergeTree() ORDER BY user_id
        """)

        ch_client.command(f"""
            INSERT INTO {test_db}.users VALUES (1, 'Alice'), (2, 'Bob')
        """)

        # Create orders with user reference
        ch_client.command(f"""
            CREATE TABLE {test_db}.orders (
                order_id UInt64,
                user_id UInt64
            ) ENGINE = MergeTree() ORDER BY order_id
        """)

        ch_client.command(f"""
            INSERT INTO {test_db}.orders VALUES (100, 1), (101, 2), (102, 999)
        """)

        # Check for orphan orders
        result = ch_client.query(f"""
            SELECT count() as orphan_count
            FROM {test_db}.orders o
            LEFT JOIN {test_db}.users u ON o.user_id = u.user_id
            WHERE u.user_id IS NULL
        """)

        orphan_count = result.result_rows[0][0]
        # Test would fail here - 1 orphan order with user_id=999
        assert orphan_count == 1  # Or assert == 0 if orphans not allowed
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: ClickHouse Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      clickhouse:
        image: clickhouse/clickhouse-server:latest
        ports:
          - 8123:8123
          - 9000:9000

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install pytest clickhouse-connect

      - name: Wait for ClickHouse
        run: |
          until curl -s http://localhost:8123/ping; do sleep 1; done

      - name: Run tests
        run: pytest tests/ -v --tb=short
```

## Conclusion

Testing ClickHouse queries involves:

1. **Isolated test databases** for clean test environments
2. **Query logic tests** to verify SQL correctness
3. **Materialized view tests** for aggregation validation
4. **Data quality tests** for constraint checking
5. **CI/CD integration** for automated testing

With comprehensive tests, you can confidently deploy changes to your ClickHouse data pipelines.
