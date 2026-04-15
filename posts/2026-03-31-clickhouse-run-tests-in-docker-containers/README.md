# How to Run ClickHouse Tests in Docker Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Docker, Testing, Integration Test, CI/CD, Testcontainers

Description: Learn how to run ClickHouse integration tests in Docker containers using Docker Compose and Testcontainers for reliable, isolated test environments.

---

Running ClickHouse tests in Docker containers guarantees a clean, isolated environment for every test run. This guide covers using Docker Compose for local test setups and Testcontainers for programmatic test lifecycle management in Python and Go.

## Why Use Docker for ClickHouse Testing

- No shared state between test runs
- Reproducible environment matching production
- Easy to run in CI/CD pipelines (GitHub Actions, GitLab CI)
- Tests can create and drop tables without affecting real data

## Option 1 - Docker Compose Test Environment

Create a `docker-compose.test.yml` for testing:

```yaml
version: "3.8"

services:
  clickhouse-test:
    image: clickhouse/clickhouse-server:24.3
    container_name: clickhouse-test
    ports:
      - "8124:8123"
      - "9001:9000"
    environment:
      CLICKHOUSE_DB: test_db
      CLICKHOUSE_USER: test_user
      CLICKHOUSE_PASSWORD: testpass
    healthcheck:
      test: ["CMD", "clickhouse-client", "--query", "SELECT 1"]
      interval: 5s
      timeout: 5s
      retries: 10
```

Run tests:

```bash
docker compose -f docker-compose.test.yml up -d
# Wait for healthy
docker compose -f docker-compose.test.yml exec clickhouse-test \
  clickhouse-client --user test_user --password testpass \
  --query "SELECT 1 AS ok;"
# Tear down
docker compose -f docker-compose.test.yml down -v
```

## Option 2 - Testcontainers in Python

```bash
pip install testcontainers clickhouse-connect pytest
```

```python
import pytest
import clickhouse_connect
from testcontainers.clickhouse import ClickHouseContainer

@pytest.fixture(scope="session")
def ch_container():
    with ClickHouseContainer("clickhouse/clickhouse-server:24.3") as ch:
        yield ch

@pytest.fixture
def ch_client(ch_container):
    return clickhouse_connect.get_client(
        host=ch_container.get_container_host_ip(),
        port=ch_container.get_exposed_port(8123),
        username="default",
        password="",
    )

def test_insert_and_query(ch_client):
    ch_client.command("""
        CREATE TABLE IF NOT EXISTS test_events (
            id UInt32,
            name String
        ) ENGINE = MergeTree() ORDER BY id
    """)
    ch_client.insert("test_events", [[1, "alpha"], [2, "beta"]])
    result = ch_client.query("SELECT count() FROM test_events")
    assert result.result_rows[0][0] == 2
```

## Option 3 - Testcontainers in Go

```go
package main

import (
    "context"
    "testing"

    "github.com/testcontainers/testcontainers-go/modules/clickhouse"
)

func TestClickHouseQuery(t *testing.T) {
    ctx := context.Background()

    container, err := clickhouse.Run(ctx,
        "clickhouse/clickhouse-server:24.3",
    )
    if err != nil {
        t.Fatal(err)
    }
    defer container.Terminate(ctx)

    connStr, _ := container.ConnectionString(ctx)
    t.Logf("Connected to: %s", connStr)
    // run your test queries here
}
```

## CI/CD Integration

In a GitHub Actions workflow:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      clickhouse:
        image: clickhouse/clickhouse-server:24.3
        ports:
          - 8123:8123
        options: --health-cmd "clickhouse-client --query 'SELECT 1'" --health-interval 5s --health-retries 10

    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: pytest tests/
        env:
          CLICKHOUSE_HOST: localhost
          CLICKHOUSE_PORT: 8123
```

## Summary

Docker-based ClickHouse testing provides fully isolated, reproducible environments for integration tests. Whether using Docker Compose for local development or Testcontainers for programmatic lifecycle management, containerized tests integrate cleanly into modern CI/CD pipelines and prevent test pollution from shared state.
