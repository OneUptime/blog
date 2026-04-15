# How to Use Testcontainers with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Testcontainers, Integration Test, Java, Python

Description: Learn how to use Testcontainers to spin up a real ClickHouse instance in Java and Python tests for reliable, isolated integration testing.

---

## What Is Testcontainers

Testcontainers is a library that manages Docker containers from within your test code. It starts a ClickHouse container before your tests run and stops it afterward, ensuring a clean state for every test suite without manually managing Docker.

## Java with Testcontainers

Add the dependency:

```xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>clickhouse</artifactId>
  <version>1.19.7</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>1.19.7</version>
  <scope>test</scope>
</dependency>
```

```java
import org.testcontainers.clickhouse.ClickHouseContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.junit.jupiter.api.*;

@Testcontainers
class ClickHouseIntegrationTest {

    @Container
    static ClickHouseContainer clickhouse = new ClickHouseContainer(
        "clickhouse/clickhouse-server:24.3"
    );

    static com.clickhouse.jdbc.ClickHouseDataSource dataSource;

    @BeforeAll
    static void setup() throws Exception {
        dataSource = new com.clickhouse.jdbc.ClickHouseDataSource(
            clickhouse.getJdbcUrl()
        );
        try (var conn = dataSource.getConnection();
             var stmt = conn.createStatement()) {
            stmt.execute("""
                CREATE TABLE events (
                  user_id UInt64,
                  event_type String,
                  revenue Float64
                ) ENGINE = MergeTree() ORDER BY user_id
            """);
        }
    }

    @Test
    void testInsertAndQuery() throws Exception {
        try (var conn = dataSource.getConnection();
             var stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO events VALUES (1, 'purchase', 99.99)");
            var rs = stmt.executeQuery(
                "SELECT sum(revenue) FROM events WHERE user_id = 1"
            );
            rs.next();
            Assertions.assertEquals(99.99, rs.getDouble(1), 0.001);
        }
    }
}
```

## Python with Testcontainers

```bash
pip install testcontainers clickhouse-connect pytest
```

```python
import pytest
import clickhouse_connect
from testcontainers.clickhouse import ClickHouseContainer

@pytest.fixture(scope='session')
def ch_container():
    with ClickHouseContainer('clickhouse/clickhouse-server:24.3') as container:
        yield container

@pytest.fixture(scope='session')
def ch_client(ch_container):
    client = clickhouse_connect.get_client(
        host=ch_container.get_container_host_ip(),
        port=int(ch_container.get_exposed_port(8123)),
        username='default',
        password='',
    )
    client.command('''
        CREATE TABLE IF NOT EXISTS events (
          user_id    UInt64,
          event_type LowCardinality(String),
          revenue    Float64
        ) ENGINE = MergeTree()
        ORDER BY user_id
    ''')
    yield client

def test_aggregate_revenue(ch_client):
    ch_client.insert('events', [
        [1, 'purchase', 50.0],
        [1, 'purchase', 75.0],
    ], column_names=['user_id', 'event_type', 'revenue'])

    result = ch_client.query(
        'SELECT sum(revenue) FROM events WHERE user_id = 1'
    )
    assert result.result_rows[0][0] == 125.0
```

## Running the Tests

```bash
# Python
pytest tests/ -v

# Java
mvn test
```

Testcontainers requires Docker to be running on the host or in the CI environment.

## CI Configuration

```yaml
# GitHub Actions
- name: Run tests
  run: pytest tests/
  # Docker is available by default in ubuntu-latest runners
```

## Summary

Testcontainers spins up a real ClickHouse Docker container as part of your test lifecycle - no manual setup required. Use the `ClickHouseContainer` class in Java (JUnit 5) or Python (pytest fixtures) to manage container lifecycle. This gives you true integration coverage without the overhead of maintaining a shared test database.
