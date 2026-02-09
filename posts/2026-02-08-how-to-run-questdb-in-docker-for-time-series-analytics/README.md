# How to Run QuestDB in Docker for Time-Series Analytics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, QuestDB, Time-Series, Databases, Analytics, DevOps

Description: Deploy QuestDB in Docker for high-performance time-series analytics with SQL queries and InfluxDB line protocol ingestion

---

QuestDB is a high-performance time-series database built from scratch in Java and C++. It supports SQL for queries, accepts data through the InfluxDB Line Protocol, and ships with a built-in web console. Its column-oriented storage engine processes time-series queries remarkably fast, often outperforming InfluxDB and TimescaleDB on analytical workloads. Docker makes it trivial to get started.

## Why QuestDB?

Most time-series databases force you to learn a proprietary query language. QuestDB gives you standard SQL with time-series extensions. If you already know SQL, you can be productive immediately. The database also supports the InfluxDB Line Protocol (ILP) for high-throughput data ingestion, which means existing Telegraf configurations and monitoring agents can send data to QuestDB without modification.

Performance is the other major draw. QuestDB uses SIMD instructions for query execution and a column-oriented storage layout that enables fast scans over time ranges.

## Quick Start

Pull and run QuestDB with a single command.

```bash
# Start QuestDB with all interfaces exposed
docker run -d \
  --name questdb \
  -p 9000:9000 \
  -p 9009:9009 \
  -p 8812:8812 \
  -p 9003:9003 \
  -v questdb_data:/var/lib/questdb \
  questdb/questdb:8.0.0
```

Port reference:
- **9000**: Web console and REST API
- **9009**: InfluxDB Line Protocol (ILP) for data ingestion
- **8812**: PostgreSQL wire protocol (connect with psql or any PG client)
- **9003**: Health check endpoint

Open `http://localhost:9000` in your browser to access the built-in SQL console.

## Docker Compose Configuration

A complete setup with resource limits and health checks.

```yaml
# docker-compose.yml
version: "3.8"

services:
  questdb:
    image: questdb/questdb:8.0.0
    container_name: questdb
    restart: unless-stopped
    ports:
      - "9000:9000"   # Web console + REST API
      - "9009:9009"   # ILP ingestion
      - "8812:8812"   # PostgreSQL wire protocol
      - "9003:9003"   # Health monitoring
    environment:
      # Server configuration
      QDB_HTTP_ENABLED: "true"
      QDB_PG_ENABLED: "true"
      QDB_LINE_TCP_ENABLED: "true"
      # Memory settings
      QDB_SHARED_WORKER_COUNT: "4"
      QDB_PG_WORKER_COUNT: "2"
      QDB_LINE_TCP_WRITER_WORKER_COUNT: "2"
      # Commit lag for batching writes (microseconds)
      QDB_CAIRO_COMMIT_LAG: "1000"
    volumes:
      - questdb_data:/var/lib/questdb
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9003/status"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "4.0"

volumes:
  questdb_data:
    driver: local
```

```bash
docker compose up -d
```

## Creating Tables

Connect through the web console at `http://localhost:9000` or via psql.

```bash
# Connect using the PostgreSQL wire protocol
docker exec -it questdb psql -h localhost -p 8812 -U admin -d questdb
```

Create a table optimized for time-series data. The `PARTITION BY` clause controls how data files are organized on disk.

```sql
-- Create a table for server metrics, partitioned by day
CREATE TABLE IF NOT EXISTS server_metrics (
    timestamp TIMESTAMP,
    host SYMBOL,          -- SYMBOL type for low-cardinality strings (indexed)
    cpu_usage DOUBLE,
    memory_used LONG,
    disk_io_read DOUBLE,
    disk_io_write DOUBLE,
    network_in DOUBLE,
    network_out DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY WAL;
```

The `SYMBOL` type is important. It creates a dictionary-encoded column that is much faster for filtering and grouping than regular strings. Use it for columns like hostnames, regions, or status codes.

## Ingesting Data via InfluxDB Line Protocol

The fastest way to push data into QuestDB is through the InfluxDB Line Protocol on port 9009.

```bash
# Send data points using the ILP format over TCP
# Format: measurement,tag=value field=value timestamp_nanoseconds
echo "server_metrics,host=web-01 cpu_usage=45.2,memory_used=8589934592i,disk_io_read=120.5,disk_io_write=85.3,network_in=1024.0,network_out=2048.0 $(date +%s)000000000" | \
  nc -q 0 localhost 9009

echo "server_metrics,host=web-02 cpu_usage=72.8,memory_used=12884901888i,disk_io_read=200.1,disk_io_write=150.7,network_in=2048.0,network_out=4096.0 $(date +%s)000000000" | \
  nc -q 0 localhost 9009
```

For higher throughput, send multiple lines in a single TCP connection.

```python
# ingest.py - High-throughput data ingestion using QuestDB's client
# pip install questdb
import time
import random
from questdb.ingress import Sender, IngressError

hosts = ['web-01', 'web-02', 'web-03', 'db-01', 'cache-01']

try:
    # Connect to QuestDB's ILP endpoint
    with Sender('localhost', 9009) as sender:
        for i in range(10000):
            host = random.choice(hosts)
            sender.row(
                'server_metrics',
                symbols={'host': host},
                columns={
                    'cpu_usage': random.uniform(10, 95),
                    'memory_used': random.randint(4_000_000_000, 16_000_000_000),
                    'disk_io_read': random.uniform(50, 500),
                    'disk_io_write': random.uniform(30, 300),
                    'network_in': random.uniform(500, 5000),
                    'network_out': random.uniform(1000, 10000),
                },
                at=time.time_ns()
            )
            # Flush every 1000 rows for efficiency
            if (i + 1) % 1000 == 0:
                sender.flush()
                print(f"Flushed {i + 1} rows")
except IngressError as e:
    print(f"Ingestion error: {e}")
```

## Time-Series Queries

QuestDB extends standard SQL with time-series functions.

```sql
-- Average CPU usage per host, sampled at 1-hour intervals
SELECT
    timestamp,
    host,
    avg(cpu_usage) AS avg_cpu,
    max(cpu_usage) AS peak_cpu,
    avg(memory_used) / 1073741824 AS avg_memory_gb
FROM server_metrics
WHERE timestamp IN '2025-03-01'
SAMPLE BY 1h
ALIGN TO CALENDAR;
```

The `SAMPLE BY` clause is QuestDB's equivalent of time bucketing. It groups rows into fixed time intervals.

```sql
-- Find the latest reading for each host using LATEST ON
SELECT * FROM server_metrics
LATEST ON timestamp PARTITION BY host;
```

```sql
-- Detect CPU spikes: rows where CPU jumped by more than 20% from the previous reading
SELECT
    timestamp,
    host,
    cpu_usage,
    cpu_usage - lag(cpu_usage) OVER (PARTITION BY host ORDER BY timestamp) AS cpu_change
FROM server_metrics
WHERE timestamp > dateadd('h', -6, now())
ORDER BY timestamp DESC;
```

## REST API for Queries

QuestDB exposes a REST API for running queries programmatically.

```bash
# Execute a query via the REST API and get JSON results
curl -G "http://localhost:9000/exec" \
  --data-urlencode "query=SELECT host, avg(cpu_usage) FROM server_metrics SAMPLE BY 1h LIMIT 10"

# Export query results as CSV
curl -G "http://localhost:9000/exp" \
  --data-urlencode "query=SELECT * FROM server_metrics WHERE timestamp IN '2025-03-01'" \
  -o metrics_export.csv
```

## Data Retention

Drop old partitions to manage disk space.

```sql
-- Drop partitions older than 30 days
ALTER TABLE server_metrics DROP PARTITION
WHERE timestamp < dateadd('d', -30, now());

-- Check partition details
SELECT * FROM table_partitions('server_metrics');
```

## Monitoring QuestDB

Check database health and table statistics.

```bash
# Health check endpoint
curl http://localhost:9003/status

# View table metadata via SQL
curl -G "http://localhost:9000/exec" \
  --data-urlencode "query=SHOW TABLES"
```

```sql
-- Check table size and row count
SELECT * FROM tables();

-- Check column details
SHOW COLUMNS FROM server_metrics;
```

## Summary

QuestDB in Docker gives you a high-performance time-series database with SQL support and InfluxDB-compatible ingestion. Start a container, create tables with `PARTITION BY` for time-based organization, use `SYMBOL` types for categorical columns, and ingest data through the ILP endpoint for maximum throughput. Query with standard SQL extended by `SAMPLE BY` for time bucketing and `LATEST ON` for last-value queries. The built-in web console makes exploration straightforward, and the REST API enables programmatic access from any language.
