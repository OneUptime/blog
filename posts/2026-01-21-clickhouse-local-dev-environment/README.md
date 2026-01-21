# How to Set Up a Local ClickHouse Development Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Development, Docker, Local Setup, Testing, IDE Integration

Description: A comprehensive guide to setting up a local ClickHouse development environment using Docker Compose, with test data generation, IDE integration, and debugging tools for efficient development workflows.

---

A well-configured local development environment accelerates ClickHouse development and testing. This guide covers Docker-based setup, sample data generation, IDE integration, and development best practices.

## Docker Compose Setup

### Basic Single-Node Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse-dev
    ports:
      - "8123:8123"   # HTTP interface
      - "9000:9000"   # Native protocol
      - "9009:9009"   # Interserver (replication)
    volumes:
      - ./data:/var/lib/clickhouse
      - ./logs:/var/log/clickhouse-server
      - ./config:/etc/clickhouse-server/config.d
      - ./users:/etc/clickhouse-server/users.d
    environment:
      - CLICKHOUSE_DB=default
      - CLICKHOUSE_USER=default
      - CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    healthcheck:
      test: ["CMD", "clickhouse-client", "--query", "SELECT 1"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Optional: Grafana for visualization
  grafana:
    image: grafana/grafana:latest
    container_name: grafana-dev
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - clickhouse

volumes:
  grafana-data:
```

### Multi-Node Cluster Setup

```yaml
# docker-compose-cluster.yml
version: '3.8'

services:
  clickhouse-01:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse-01
    hostname: clickhouse-01
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - ./cluster-config/clickhouse-01:/etc/clickhouse-server/config.d
      - ./data-01:/var/lib/clickhouse
    networks:
      - clickhouse-network

  clickhouse-02:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse-02
    hostname: clickhouse-02
    ports:
      - "8124:8123"
      - "9001:9000"
    volumes:
      - ./cluster-config/clickhouse-02:/etc/clickhouse-server/config.d
      - ./data-02:/var/lib/clickhouse
    networks:
      - clickhouse-network

  clickhouse-keeper:
    image: clickhouse/clickhouse-keeper:latest
    container_name: clickhouse-keeper
    hostname: clickhouse-keeper
    ports:
      - "2181:2181"
    volumes:
      - ./keeper-config:/etc/clickhouse-keeper
      - keeper-data:/var/lib/clickhouse-keeper
    networks:
      - clickhouse-network

networks:
  clickhouse-network:
    driver: bridge

volumes:
  keeper-data:
```

### Configuration Files

```xml
<!-- config/custom.xml -->
<clickhouse>
    <logger>
        <level>debug</level>
        <console>1</console>
    </logger>

    <!-- Development-friendly settings -->
    <max_concurrent_queries>100</max_concurrent_queries>
    <max_connections>100</max_connections>

    <!-- Enable query logging -->
    <query_log>
        <database>system</database>
        <table>query_log</table>
    </query_log>
</clickhouse>
```

```xml
<!-- users/dev_users.xml -->
<clickhouse>
    <users>
        <default>
            <password></password>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
            <access_management>1</access_management>
        </default>

        <developer>
            <password>dev123</password>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
        </developer>
    </users>
</clickhouse>
```

## Starting the Environment

```bash
# Start single node
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f clickhouse

# Connect with clickhouse-client
docker exec -it clickhouse-dev clickhouse-client

# Or use installed client
clickhouse-client --host localhost --port 9000
```

## Sample Data Generation

### Generate Test Events

```sql
-- Create sample events table
CREATE TABLE IF NOT EXISTS events (
    event_id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3) DEFAULT now64(3),
    user_id UInt64,
    session_id String,
    event_type LowCardinality(String),
    page_url String,
    country LowCardinality(String),
    device_type LowCardinality(String),
    revenue Decimal64(2)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, timestamp);

-- Generate 1 million sample events
INSERT INTO events (user_id, session_id, event_type, page_url, country, device_type, revenue)
SELECT
    rand() % 10000 AS user_id,
    generateUUIDv4() AS session_id,
    arrayElement(['page_view', 'click', 'purchase', 'signup'], rand() % 4 + 1) AS event_type,
    concat('/page/', toString(rand() % 100)) AS page_url,
    arrayElement(['US', 'UK', 'DE', 'FR', 'JP', 'BR', 'IN'], rand() % 7 + 1) AS country,
    arrayElement(['desktop', 'mobile', 'tablet'], rand() % 3 + 1) AS device_type,
    if(rand() % 4 = 0, round(rand() % 10000 / 100, 2), 0) AS revenue
FROM numbers(1000000);

-- Verify data
SELECT count(), uniq(user_id), sum(revenue) FROM events;
```

### Generate Time-Series Data

```sql
-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    metric_name LowCardinality(String),
    timestamp DateTime,
    value Float64,
    tags Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (metric_name, timestamp);

-- Generate time-series data for last 30 days
INSERT INTO metrics
SELECT
    arrayElement(['cpu_usage', 'memory_usage', 'disk_io', 'network_in', 'network_out'], (number % 5) + 1) AS metric_name,
    now() - INTERVAL (number / 5) SECOND AS timestamp,
    rand() / 10000000 * 100 AS value,
    map('host', concat('server-', toString(rand() % 10)), 'env', arrayElement(['prod', 'staging', 'dev'], rand() % 3 + 1)) AS tags
FROM numbers(1000000 * 5);
```

## IDE Integration

### VS Code Setup

Install extensions:
- **ClickHouse** (by JetBrains) - Query execution
- **SQL Formatter** - SQL formatting
- **Rainbow CSV** - CSV file viewing

```json
// .vscode/settings.json
{
    "clickhouse.connections": [
        {
            "name": "Local Dev",
            "host": "localhost",
            "port": 8123,
            "username": "default",
            "password": ""
        }
    ],
    "editor.formatOnSave": true,
    "[sql]": {
        "editor.defaultFormatter": "adpyke.vscode-sql-formatter"
    }
}
```

### DataGrip / DBeaver Setup

```
Connection Settings:
- Host: localhost
- Port: 8123 (HTTP) or 9000 (Native)
- Database: default
- User: default
- Password: (empty for dev)
- Driver: ClickHouse JDBC
```

### SQL File Organization

```
project/
├── sql/
│   ├── migrations/
│   │   ├── 001_create_events.sql
│   │   ├── 002_add_indexes.sql
│   │   └── 003_create_views.sql
│   ├── queries/
│   │   ├── analytics/
│   │   │   ├── daily_stats.sql
│   │   │   └── user_funnel.sql
│   │   └── reports/
│   │       └── monthly_summary.sql
│   └── seed/
│       └── sample_data.sql
├── docker-compose.yml
└── README.md
```

## Development Tools

### clickhouse-local for Testing

```bash
# Test queries without a server
clickhouse-local --query "
    SELECT
        number,
        number * 2 AS doubled
    FROM numbers(10)
"

# Query local files
clickhouse-local --query "
    SELECT *
    FROM file('data.csv', CSV, 'id UInt32, name String')
    LIMIT 10
"

# Test complex queries
cat query.sql | clickhouse-local --query "$(cat)"
```

### Query Profiling

```sql
-- Enable query profiling
SET log_queries = 1;
SET log_query_threads = 1;

-- Run your query
SELECT ...;

-- Check query log
SELECT
    query_id,
    query,
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;

-- Analyze with EXPLAIN
EXPLAIN PLAN
SELECT * FROM events WHERE user_id = 123;

EXPLAIN PIPELINE
SELECT * FROM events WHERE user_id = 123;
```

### Useful Development Queries

```sql
-- Check table sizes
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    sum(rows) AS rows
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC;

-- Check running queries
SELECT
    query_id,
    user,
    elapsed,
    read_rows,
    memory_usage,
    query
FROM system.processes;

-- Kill a query
KILL QUERY WHERE query_id = 'xxx';

-- Check merges in progress
SELECT
    database,
    table,
    elapsed,
    progress,
    num_parts
FROM system.merges;
```

## Testing Setup

### pytest Integration

```python
# conftest.py
import pytest
import clickhouse_connect

@pytest.fixture(scope="session")
def clickhouse_client():
    client = clickhouse_connect.get_client(
        host='localhost',
        port=8123,
        username='default'
    )
    yield client
    client.close()

@pytest.fixture(scope="function")
def test_table(clickhouse_client):
    """Create a test table and clean up after"""
    table_name = f"test_table_{uuid.uuid4().hex[:8]}"
    clickhouse_client.command(f"""
        CREATE TABLE {table_name} (
            id UInt64,
            value String
        ) ENGINE = Memory
    """)
    yield table_name
    clickhouse_client.command(f"DROP TABLE IF EXISTS {table_name}")
```

```python
# test_queries.py
def test_insert_and_query(clickhouse_client, test_table):
    # Insert data
    clickhouse_client.command(f"""
        INSERT INTO {test_table} VALUES (1, 'test')
    """)

    # Query
    result = clickhouse_client.query(f"SELECT * FROM {test_table}")
    assert len(result.result_rows) == 1
    assert result.result_rows[0] == (1, 'test')
```

## Makefile for Common Tasks

```makefile
# Makefile
.PHONY: up down logs shell migrate seed test

up:
    docker-compose up -d

down:
    docker-compose down

logs:
    docker-compose logs -f clickhouse

shell:
    docker exec -it clickhouse-dev clickhouse-client

migrate:
    for f in sql/migrations/*.sql; do \
        docker exec -i clickhouse-dev clickhouse-client < $$f; \
    done

seed:
    docker exec -i clickhouse-dev clickhouse-client < sql/seed/sample_data.sql

test:
    pytest tests/ -v

clean:
    docker-compose down -v
    rm -rf data/ logs/
```

## Conclusion

A well-configured local ClickHouse development environment includes:

1. **Docker Compose** setup for easy start/stop
2. **Sample data** generation scripts
3. **IDE integration** for query development
4. **Profiling tools** for optimization
5. **Testing framework** for validation
6. **Automation** with Makefiles

This setup enables rapid development and testing of ClickHouse queries and schemas before deployment to production.
