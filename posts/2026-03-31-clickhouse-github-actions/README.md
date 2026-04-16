# How to Set Up ClickHouse in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, GitHub Action, CI/CD, Testing, Automation

Description: Learn how to run ClickHouse as a service container in GitHub Actions workflows for integration testing and schema migration validation.

---

## Running ClickHouse as a Service Container

GitHub Actions supports Docker service containers that run alongside your job. ClickHouse can be started as a service with health checks so tests only begin after the database is fully ready.

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  integration-test:
    runs-on: ubuntu-latest

    services:
      clickhouse:
        image: clickhouse/clickhouse-server:24.3
        ports:
          - 8123:8123
          - 9000:9000
        options: >-
          --health-cmd "wget -qO- http://localhost:8123/ping || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10
          --health-start-period 30s
        env:
          CLICKHOUSE_USER: default
          CLICKHOUSE_PASSWORD: ""

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Cache pip packages
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: pip-${{ hashFiles('**/requirements*.txt') }}

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Wait for ClickHouse
        run: |
          for i in {1..30}; do
            wget -qO- http://localhost:8123/ping && break || sleep 2
          done

      - name: Run migrations
        run: python scripts/migrate.py
        env:
          CLICKHOUSE_HOST: localhost
          CLICKHOUSE_PORT: "8123"

      - name: Run integration tests
        run: pytest tests/integration/ -v --tb=short
        env:
          CLICKHOUSE_HOST: localhost
          CLICKHOUSE_PORT: "8123"
```

## Matrix Testing Against Multiple ClickHouse Versions

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        clickhouse-version: ["24.3", "24.8", "25.1"]

    services:
      clickhouse:
        image: clickhouse/clickhouse-server:${{ matrix.clickhouse-version }}
        ports:
          - 8123:8123
        options: >-
          --health-cmd "wget -qO- http://localhost:8123/ping || exit 1"
          --health-interval 5s
          --health-retries 15
```

## Running ClickHouse Queries Directly in Shell Steps

```yaml
      - name: Verify schema
        run: |
          clickhouse-client \
            --host localhost \
            --port 9000 \
            --query "SHOW TABLES FROM default"
```

Install the client:

```yaml
      - name: Install ClickHouse client
        run: |
          curl -fsSL https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key | sudo gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg
          ARCH=$(dpkg --print-architecture)
          echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg arch=${ARCH}] https://packages.clickhouse.com/deb stable main" | sudo tee /etc/apt/sources.list.d/clickhouse.list
          sudo apt-get update -q && sudo apt-get install -y clickhouse-client
```

## Caching Between Runs

Cache pip dependencies to speed up repeated runs:

```yaml
      - uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('requirements*.txt') }}
          restore-keys: ${{ runner.os }}-pip-
```

## Summary

GitHub Actions runs ClickHouse as a Docker service container with built-in health checks that block the job until the database is ready. Use `options` to configure health check commands, expose ports for both HTTP (8123) and native TCP (9000), and pass environment variables for authentication. Use a version matrix to test against multiple ClickHouse releases and ensure forward compatibility.
