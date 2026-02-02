# How to Use TimescaleDB with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TimescaleDB, Python, PostgreSQL, Time-Series, Database, psycopg2, SQLAlchemy, Data Analytics

Description: Learn how to use TimescaleDB with Python for time-series data management. Covers installation, hypertables, continuous aggregates, compression, and best practices for building scalable time-series applications.

---

> TimescaleDB extends PostgreSQL with powerful time-series capabilities. Built as a PostgreSQL extension, it provides automatic partitioning, compression, and continuous aggregates while maintaining full SQL compatibility. Python developers can leverage existing PostgreSQL libraries to work with TimescaleDB seamlessly.

Time-series data is everywhere, from IoT sensors and application metrics to financial data and user analytics. TimescaleDB makes storing and querying billions of time-series data points efficient and straightforward. In this guide, you will learn how to integrate TimescaleDB with Python applications.

---

## Architecture Overview

The following diagram shows how Python applications interact with TimescaleDB and how data flows through the system.

```mermaid
flowchart TD
    subgraph Python Application
        A[Python App] --> B[psycopg2/asyncpg]
        A --> C[SQLAlchemy ORM]
        B --> D[Connection Pool]
        C --> D
    end

    subgraph TimescaleDB
        D --> E[PostgreSQL Core]
        E --> F[TimescaleDB Extension]
        F --> G[Hypertables]
        G --> H[Chunks - Auto Partitioned]
        F --> I[Continuous Aggregates]
        F --> J[Compression]
    end

    subgraph Storage
        H --> K[Recent Data - Uncompressed]
        H --> L[Historical Data - Compressed]
    end
```

---

## Prerequisites and Installation

Before starting, ensure you have TimescaleDB installed. You can use Docker for a quick setup or install it directly on your system.

### Docker Setup

Running TimescaleDB in Docker provides a quick and isolated development environment. The following command starts a TimescaleDB container with persistent storage.

```bash
# Pull and run TimescaleDB container
# -d: Run in detached mode
# -p: Map port 5432 to host
# --name: Container name for easy reference
# -v: Persist data across container restarts
docker run -d \
  --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -v timescale_data:/var/lib/postgresql/data \
  timescale/timescaledb:latest-pg15
```

### Python Dependencies

Install the required Python packages for database connectivity. psycopg2 provides the core PostgreSQL driver, while asyncpg enables async operations for high-performance applications.

```bash
# Install required Python packages
# psycopg2-binary: PostgreSQL adapter (includes libpq)
# asyncpg: Async PostgreSQL driver for high performance
# sqlalchemy: ORM with PostgreSQL support
# pandas: Data manipulation and analysis
pip install psycopg2-binary asyncpg sqlalchemy pandas
```

---

## Basic Connection Setup

### Synchronous Connection with psycopg2

The psycopg2 library provides a straightforward way to connect to TimescaleDB. Creating the TimescaleDB extension is required only once per database.

```python
# timescale_connection.py
# Basic TimescaleDB connection using psycopg2
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

# Database connection parameters
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "timeseries_db",
    "user": "postgres",
    "password": "password"
}

def create_connection_pool(min_conn=5, max_conn=20):
    """
    Create a connection pool for efficient connection reuse.
    Pools reduce overhead of creating new connections for each query.
    """
    return pool.ThreadedConnectionPool(
        minconn=min_conn,  # Minimum connections to keep ready
        maxconn=max_conn,  # Maximum connections allowed
        **DB_CONFIG
    )

# Initialize global connection pool
connection_pool = create_connection_pool()

@contextmanager
def get_connection():
    """
    Context manager for safe connection handling.
    Automatically returns connection to pool when done.
    """
    conn = connection_pool.getconn()
    try:
        yield conn
        conn.commit()  # Commit transaction if no errors
    except Exception as e:
        conn.rollback()  # Rollback on any error
        raise e
    finally:
        connection_pool.putconn(conn)  # Return to pool

def setup_timescaledb():
    """
    Enable TimescaleDB extension on the database.
    Must be run once before creating hypertables.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Enable the TimescaleDB extension
            cur.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")
            print("TimescaleDB extension enabled successfully")
```

### Asynchronous Connection with asyncpg

For high-throughput applications, asyncpg provides superior performance through asynchronous I/O. The connection pool manages connections efficiently across async tasks.

```python
# async_connection.py
# Async TimescaleDB connection using asyncpg
import asyncio
import asyncpg
from typing import Optional

class AsyncTimescaleDB:
    """
    Async database handler for TimescaleDB.
    Uses connection pooling for efficient resource management.
    """

    def __init__(self, dsn: str):
        # DSN format: postgresql://user:password@host:port/database
        self.dsn = dsn
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """
        Create connection pool with specified limits.
        min_size: Connections kept ready for immediate use
        max_size: Maximum concurrent connections
        """
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=5,
            max_size=20,
            command_timeout=60  # Query timeout in seconds
        )

    async def close(self):
        """Close all connections in the pool"""
        if self.pool:
            await self.pool.close()

    async def execute(self, query: str, *args):
        """Execute a query without returning results"""
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args):
        """Execute a query and return all results"""
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        """Execute a query and return single row"""
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

# Usage example
async def main():
    db = AsyncTimescaleDB("postgresql://postgres:password@localhost:5432/timeseries_db")
    await db.connect()

    # Enable TimescaleDB extension
    await db.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

    await db.close()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Creating Hypertables

Hypertables are the core concept in TimescaleDB. They look like regular tables but automatically partition data by time into chunks, enabling efficient queries and data management.

### Hypertable Structure

```mermaid
flowchart LR
    subgraph Hypertable
        A[sensor_data] --> B[Chunk 1<br/>Jan 1-7]
        A --> C[Chunk 2<br/>Jan 8-14]
        A --> D[Chunk 3<br/>Jan 15-21]
        A --> E[Chunk N<br/>...]
    end

    F[INSERT Query] --> A
    G[SELECT Query<br/>WHERE time > Jan 10] --> C
    G --> D
    G --> E
```

### Creating a Hypertable for Sensor Data

The following code creates a regular PostgreSQL table and converts it into a hypertable. The chunk_time_interval determines how data is partitioned, typically set based on your query patterns.

```python
# create_hypertable.py
# Creating and configuring hypertables in TimescaleDB
from timescale_connection import get_connection

def create_sensor_hypertable():
    """
    Create a hypertable for storing sensor readings.
    Hypertables automatically partition data by time for efficient queries.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Step 1: Create regular PostgreSQL table
            # Note: time column should be NOT NULL for hypertables
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sensor_data (
                    time        TIMESTAMPTZ NOT NULL,
                    sensor_id   INTEGER NOT NULL,
                    temperature DOUBLE PRECISION,
                    humidity    DOUBLE PRECISION,
                    pressure    DOUBLE PRECISION,
                    location    TEXT
                );
            """)

            # Step 2: Convert to hypertable
            # chunk_time_interval: Size of each time partition
            # if_not_exists: Prevent error if already a hypertable
            cur.execute("""
                SELECT create_hypertable(
                    'sensor_data',
                    'time',
                    chunk_time_interval => INTERVAL '1 day',
                    if_not_exists => TRUE
                );
            """)

            # Step 3: Create indexes for common query patterns
            # Composite index on sensor_id and time for filtered queries
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_sensor_time
                ON sensor_data (sensor_id, time DESC);
            """)

            # Index on location for location-based queries
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_sensor_location
                ON sensor_data (location, time DESC);
            """)

            print("Hypertable 'sensor_data' created successfully")

def create_metrics_hypertable():
    """
    Create a hypertable for application metrics.
    Uses shorter chunk interval for high-frequency data.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS app_metrics (
                    time        TIMESTAMPTZ NOT NULL,
                    host        TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    value       DOUBLE PRECISION NOT NULL,
                    tags        JSONB DEFAULT '{}'
                );
            """)

            # Shorter chunk interval for high-frequency metrics
            # 1 hour chunks work well for metrics collected every second
            cur.execute("""
                SELECT create_hypertable(
                    'app_metrics',
                    'time',
                    chunk_time_interval => INTERVAL '1 hour',
                    if_not_exists => TRUE
                );
            """)

            # Composite index for metric queries by host and name
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_metrics_host_name
                ON app_metrics (host, metric_name, time DESC);
            """)

            print("Hypertable 'app_metrics' created successfully")

if __name__ == "__main__":
    create_sensor_hypertable()
    create_metrics_hypertable()
```

---

## Inserting Time-Series Data

### Batch Inserts for High Throughput

Batch inserts significantly improve write performance by reducing round trips to the database. The execute_values function from psycopg2.extras efficiently handles bulk inserts.

```python
# batch_insert.py
# Efficient batch insertion of time-series data
import psycopg2.extras
from datetime import datetime, timedelta
import random
from timescale_connection import get_connection

def insert_sensor_readings_batch(readings: list):
    """
    Insert multiple sensor readings in a single batch.
    Much faster than individual inserts for large datasets.

    Args:
        readings: List of tuples (time, sensor_id, temp, humidity, pressure, location)
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Use execute_values for efficient batch insert
            # page_size controls how many rows per INSERT statement
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO sensor_data
                    (time, sensor_id, temperature, humidity, pressure, location)
                VALUES %s
                """,
                readings,
                page_size=1000  # Rows per INSERT statement
            )

    print(f"Inserted {len(readings)} sensor readings")

def generate_sample_data(num_sensors=10, num_hours=24):
    """
    Generate sample sensor data for testing.
    Creates realistic temperature, humidity, and pressure readings.
    """
    readings = []
    locations = ["warehouse_a", "warehouse_b", "office_1", "office_2", "datacenter"]
    base_time = datetime.now() - timedelta(hours=num_hours)

    for hour in range(num_hours):
        for minute in range(60):
            timestamp = base_time + timedelta(hours=hour, minutes=minute)

            for sensor_id in range(num_sensors):
                # Generate realistic sensor values with some variation
                reading = (
                    timestamp,
                    sensor_id,
                    20 + random.gauss(0, 5),      # Temperature around 20C
                    50 + random.gauss(0, 10),     # Humidity around 50%
                    1013 + random.gauss(0, 5),    # Pressure around 1013 hPa
                    random.choice(locations)
                )
                readings.append(reading)

    return readings

# Example usage
if __name__ == "__main__":
    # Generate and insert sample data
    sample_readings = generate_sample_data(num_sensors=10, num_hours=24)
    insert_sensor_readings_batch(sample_readings)
```

### Async Batch Inserts

For applications handling high write loads, async batch inserts with asyncpg provide better throughput by not blocking the event loop during database operations.

```python
# async_batch_insert.py
# High-performance async batch insertion
import asyncio
import asyncpg
from datetime import datetime, timedelta
import random

async def insert_metrics_batch(pool: asyncpg.Pool, metrics: list):
    """
    Insert metrics using async copy for maximum performance.
    COPY is faster than INSERT for large batches.

    Args:
        pool: asyncpg connection pool
        metrics: List of tuples (time, host, metric_name, value, tags)
    """
    async with pool.acquire() as conn:
        # Use COPY for bulk inserts - faster than INSERT
        await conn.copy_records_to_table(
            'app_metrics',
            records=metrics,
            columns=['time', 'host', 'metric_name', 'value', 'tags']
        )

async def insert_with_prepared_statement(pool: asyncpg.Pool, metrics: list):
    """
    Insert using prepared statements for repeated inserts.
    Prepared statements reduce query parsing overhead.
    """
    async with pool.acquire() as conn:
        # Prepare the statement once
        stmt = await conn.prepare("""
            INSERT INTO app_metrics (time, host, metric_name, value, tags)
            VALUES ($1, $2, $3, $4, $5)
        """)

        # Execute in batches using executemany
        await stmt.executemany(metrics)

async def buffered_writer(pool: asyncpg.Pool, buffer_size=1000, flush_interval=5):
    """
    Buffered writer that batches writes for efficiency.
    Flushes when buffer is full or interval expires.
    """
    buffer = []
    last_flush = datetime.now()

    async def flush():
        nonlocal buffer, last_flush
        if buffer:
            await insert_metrics_batch(pool, buffer)
            print(f"Flushed {len(buffer)} metrics")
            buffer = []
            last_flush = datetime.now()

    async def write(metric: tuple):
        nonlocal buffer
        buffer.append(metric)

        # Flush if buffer is full or time interval exceeded
        time_since_flush = (datetime.now() - last_flush).total_seconds()
        if len(buffer) >= buffer_size or time_since_flush >= flush_interval:
            await flush()

    return write, flush

# Example usage demonstrating buffered writes
async def main():
    pool = await asyncpg.create_pool(
        "postgresql://postgres:password@localhost:5432/timeseries_db"
    )

    write, flush = await buffered_writer(pool)

    # Simulate writing metrics
    import json
    for i in range(5000):
        metric = (
            datetime.now(),
            "host-1",
            "cpu_usage",
            random.uniform(0, 100),
            json.dumps({"core": i % 4})  # JSONB tags
        )
        await write(metric)

    # Final flush to ensure all data is written
    await flush()
    await pool.close()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Querying Time-Series Data

### Time-Based Queries

TimescaleDB optimizes time-based queries by only scanning relevant chunks. The time_bucket function is essential for aggregating data into fixed intervals.

```python
# query_examples.py
# Common time-series query patterns
from timescale_connection import get_connection
from datetime import datetime, timedelta

def get_recent_readings(sensor_id: int, hours: int = 24):
    """
    Retrieve recent readings for a specific sensor.
    Uses time filter to leverage chunk exclusion.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT time, temperature, humidity, pressure
                FROM sensor_data
                WHERE sensor_id = %s
                  AND time > NOW() - INTERVAL '%s hours'
                ORDER BY time DESC
                LIMIT 1000;
            """, (sensor_id, hours))

            return cur.fetchall()

def get_hourly_averages(sensor_id: int, days: int = 7):
    """
    Calculate hourly averages using time_bucket.
    time_bucket groups timestamps into fixed intervals.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # time_bucket creates fixed-size time intervals
            # '1 hour' means aggregate data into hourly buckets
            cur.execute("""
                SELECT
                    time_bucket('1 hour', time) AS hour,
                    AVG(temperature) AS avg_temp,
                    AVG(humidity) AS avg_humidity,
                    MIN(temperature) AS min_temp,
                    MAX(temperature) AS max_temp,
                    COUNT(*) AS reading_count
                FROM sensor_data
                WHERE sensor_id = %s
                  AND time > NOW() - INTERVAL '%s days'
                GROUP BY hour
                ORDER BY hour DESC;
            """, (sensor_id, days))

            return cur.fetchall()

def get_location_statistics(location: str, interval: str = '15 minutes'):
    """
    Get aggregated statistics for a location.
    Demonstrates dynamic interval selection.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    time_bucket(%s, time) AS bucket,
                    COUNT(DISTINCT sensor_id) AS active_sensors,
                    AVG(temperature) AS avg_temp,
                    STDDEV(temperature) AS temp_stddev,
                    AVG(humidity) AS avg_humidity,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY temperature) AS temp_p95
                FROM sensor_data
                WHERE location = %s
                  AND time > NOW() - INTERVAL '24 hours'
                GROUP BY bucket
                ORDER BY bucket DESC;
            """, (interval, location))

            return cur.fetchall()
```

### Advanced Query Patterns

The following examples demonstrate more advanced query patterns including gap filling, last known values, and time-weighted averages.

```python
# advanced_queries.py
# Advanced TimescaleDB query patterns
from timescale_connection import get_connection

def get_readings_with_gap_fill(sensor_id: int, interval: str = '5 minutes'):
    """
    Retrieve readings with gap filling for missing data points.
    Uses time_bucket_gapfill to create continuous time series.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # time_bucket_gapfill creates buckets even when no data exists
            # locf() fills gaps with last observed value (Last Observation Carried Forward)
            # interpolate() creates linear interpolation between points
            cur.execute("""
                SELECT
                    time_bucket_gapfill(%s, time) AS bucket,
                    sensor_id,
                    locf(AVG(temperature)) AS temperature,
                    interpolate(AVG(humidity)) AS humidity
                FROM sensor_data
                WHERE sensor_id = %s
                  AND time > NOW() - INTERVAL '24 hours'
                  AND time <= NOW()
                GROUP BY bucket, sensor_id
                ORDER BY bucket;
            """, (interval, sensor_id))

            return cur.fetchall()

def get_last_reading_per_sensor():
    """
    Get the most recent reading for each sensor efficiently.
    Uses DISTINCT ON which TimescaleDB optimizes well.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # DISTINCT ON returns only the first row for each sensor_id
            # Combined with ORDER BY time DESC, gets the latest reading
            cur.execute("""
                SELECT DISTINCT ON (sensor_id)
                    sensor_id,
                    time,
                    temperature,
                    humidity,
                    pressure,
                    location
                FROM sensor_data
                WHERE time > NOW() - INTERVAL '1 hour'
                ORDER BY sensor_id, time DESC;
            """)

            return cur.fetchall()

def get_moving_average(sensor_id: int, window_size: str = '1 hour'):
    """
    Calculate moving average using window functions.
    Useful for smoothing noisy sensor data.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Window function calculates average over a time range
            # RANGE BETWEEN creates a sliding window based on time
            cur.execute("""
                SELECT
                    time,
                    temperature,
                    AVG(temperature) OVER (
                        ORDER BY time
                        RANGE BETWEEN INTERVAL %s PRECEDING AND CURRENT ROW
                    ) AS moving_avg_temp,
                    humidity,
                    AVG(humidity) OVER (
                        ORDER BY time
                        RANGE BETWEEN INTERVAL %s PRECEDING AND CURRENT ROW
                    ) AS moving_avg_humidity
                FROM sensor_data
                WHERE sensor_id = %s
                  AND time > NOW() - INTERVAL '24 hours'
                ORDER BY time;
            """, (window_size, window_size, sensor_id))

            return cur.fetchall()

def detect_anomalies(sensor_id: int, threshold_stddev: float = 2.0):
    """
    Detect anomalous readings using statistical analysis.
    Flags values that deviate significantly from the mean.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Calculate statistics and flag anomalies in a single query
            # Uses subquery to compute rolling statistics
            cur.execute("""
                WITH stats AS (
                    SELECT
                        time,
                        temperature,
                        AVG(temperature) OVER w AS mean_temp,
                        STDDEV(temperature) OVER w AS stddev_temp
                    FROM sensor_data
                    WHERE sensor_id = %s
                      AND time > NOW() - INTERVAL '7 days'
                    WINDOW w AS (
                        ORDER BY time
                        ROWS BETWEEN 100 PRECEDING AND CURRENT ROW
                    )
                )
                SELECT
                    time,
                    temperature,
                    mean_temp,
                    stddev_temp,
                    ABS(temperature - mean_temp) / NULLIF(stddev_temp, 0) AS z_score
                FROM stats
                WHERE ABS(temperature - mean_temp) > (%s * stddev_temp)
                ORDER BY time DESC
                LIMIT 100;
            """, (sensor_id, threshold_stddev))

            return cur.fetchall()
```

---

## Continuous Aggregates

Continuous aggregates automatically maintain pre-computed aggregations, dramatically speeding up common queries. They update incrementally as new data arrives.

### Continuous Aggregate Workflow

```mermaid
flowchart TD
    A[Raw Data Inserts] --> B[Hypertable]
    B --> C[Continuous Aggregate<br/>Materialized View]
    C --> D[Fast Query Results]

    E[Background Worker] --> C
    B --> E

    F[Query: SELECT * FROM hourly_metrics] --> C
    G[Query: SELECT * FROM sensor_data] --> B
```

### Creating Continuous Aggregates

The following code creates a continuous aggregate that pre-computes hourly statistics. Queries against continuous aggregates are much faster because the aggregation work is done in the background.

```python
# continuous_aggregates.py
# Creating and managing continuous aggregates
from timescale_connection import get_connection

def create_hourly_aggregate():
    """
    Create a continuous aggregate for hourly sensor statistics.
    Automatically updates as new data arrives.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Drop existing aggregate if recreating
            cur.execute("""
                DROP MATERIALIZED VIEW IF EXISTS sensor_hourly_stats CASCADE;
            """)

            # Create continuous aggregate
            # WITH (timescaledb.continuous) enables automatic refresh
            cur.execute("""
                CREATE MATERIALIZED VIEW sensor_hourly_stats
                WITH (timescaledb.continuous) AS
                SELECT
                    time_bucket('1 hour', time) AS bucket,
                    sensor_id,
                    location,
                    AVG(temperature) AS avg_temp,
                    MIN(temperature) AS min_temp,
                    MAX(temperature) AS max_temp,
                    AVG(humidity) AS avg_humidity,
                    AVG(pressure) AS avg_pressure,
                    COUNT(*) AS reading_count
                FROM sensor_data
                GROUP BY bucket, sensor_id, location
                WITH NO DATA;
            """)

            # Configure automatic refresh policy
            # start_offset: How far back to refresh
            # end_offset: Gap from current time (for late-arriving data)
            # schedule_interval: How often to run refresh
            cur.execute("""
                SELECT add_continuous_aggregate_policy(
                    'sensor_hourly_stats',
                    start_offset => INTERVAL '3 days',
                    end_offset => INTERVAL '1 hour',
                    schedule_interval => INTERVAL '1 hour'
                );
            """)

            print("Continuous aggregate 'sensor_hourly_stats' created")

def create_daily_aggregate():
    """
    Create a daily aggregate for long-term trend analysis.
    Uses the hourly aggregate as source for efficiency.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE MATERIALIZED VIEW sensor_daily_stats
                WITH (timescaledb.continuous) AS
                SELECT
                    time_bucket('1 day', bucket) AS day,
                    sensor_id,
                    location,
                    AVG(avg_temp) AS avg_temp,
                    MIN(min_temp) AS min_temp,
                    MAX(max_temp) AS max_temp,
                    AVG(avg_humidity) AS avg_humidity,
                    SUM(reading_count) AS total_readings
                FROM sensor_hourly_stats
                GROUP BY day, sensor_id, location
                WITH NO DATA;
            """)

            # Daily refresh policy with longer lookback
            cur.execute("""
                SELECT add_continuous_aggregate_policy(
                    'sensor_daily_stats',
                    start_offset => INTERVAL '7 days',
                    end_offset => INTERVAL '1 day',
                    schedule_interval => INTERVAL '1 day'
                );
            """)

            print("Continuous aggregate 'sensor_daily_stats' created")

def query_hourly_stats(sensor_id: int, days: int = 7):
    """
    Query the continuous aggregate for fast results.
    Much faster than aggregating raw data on the fly.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    bucket,
                    avg_temp,
                    min_temp,
                    max_temp,
                    avg_humidity,
                    reading_count
                FROM sensor_hourly_stats
                WHERE sensor_id = %s
                  AND bucket > NOW() - INTERVAL '%s days'
                ORDER BY bucket DESC;
            """, (sensor_id, days))

            return cur.fetchall()

def refresh_aggregate_manually(view_name: str, start_time: str, end_time: str):
    """
    Manually refresh a continuous aggregate for a specific time range.
    Useful after bulk historical data loads.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CALL refresh_continuous_aggregate(%s, %s::timestamptz, %s::timestamptz);
            """, (view_name, start_time, end_time))

            print(f"Refreshed {view_name} from {start_time} to {end_time}")
```

---

## Data Compression

TimescaleDB compression reduces storage by 90-95% for time-series data. Compressed chunks remain queryable but use columnar storage optimized for analytical queries.

### Compression Architecture

```mermaid
flowchart LR
    subgraph Before Compression
        A[Chunk 1<br/>100 MB<br/>Row Storage]
        B[Chunk 2<br/>100 MB<br/>Row Storage]
        C[Chunk 3<br/>100 MB<br/>Row Storage]
    end

    subgraph After Compression
        D[Chunk 1<br/>5 MB<br/>Columnar]
        E[Chunk 2<br/>5 MB<br/>Columnar]
        F[Chunk 3<br/>100 MB<br/>Row Storage]
    end

    A --> D
    B --> E
    C --> F

    G[Compression Policy<br/>After 7 days] --> A
    G --> B
```

### Enabling Compression

The compression settings determine how data is organized in compressed chunks. Segment by columns allow efficient filtering, while order by columns optimize range scans.

```python
# compression.py
# Configuring and managing compression in TimescaleDB
from timescale_connection import get_connection

def enable_compression():
    """
    Enable compression on the sensor_data hypertable.
    Configure segment and order by columns for optimal compression.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Configure compression settings
            # segmentby: Columns to segment compressed data by (for filtering)
            # orderby: Column ordering within segments (usually time DESC)
            cur.execute("""
                ALTER TABLE sensor_data SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = 'sensor_id, location',
                    timescaledb.compress_orderby = 'time DESC'
                );
            """)

            # Add compression policy to automatically compress old chunks
            # compress_after: Age of chunks to compress
            cur.execute("""
                SELECT add_compression_policy(
                    'sensor_data',
                    compress_after => INTERVAL '7 days'
                );
            """)

            print("Compression enabled with 7-day policy")

def get_compression_stats():
    """
    Retrieve compression statistics for all hypertables.
    Shows space savings and compression ratios.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    hypertable_name,
                    before_compression_total_bytes,
                    after_compression_total_bytes,
                    ROUND(
                        (1 - after_compression_total_bytes::numeric /
                         NULLIF(before_compression_total_bytes, 0)) * 100, 2
                    ) AS compression_ratio_percent
                FROM hypertable_compression_stats('sensor_data');
            """)

            return cur.fetchall()

def compress_chunks_manually(older_than: str = '7 days'):
    """
    Manually compress chunks older than specified interval.
    Useful for initial compression of existing data.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Find and compress eligible chunks
            cur.execute("""
                SELECT compress_chunk(chunk_name)
                FROM timescaledb_information.chunks
                WHERE hypertable_name = 'sensor_data'
                  AND NOT is_compressed
                  AND range_end < NOW() - INTERVAL %s;
            """, (older_than,))

            compressed_count = cur.rowcount
            print(f"Compressed {compressed_count} chunks")

def decompress_chunk_for_update(chunk_name: str):
    """
    Decompress a chunk to allow updates or deletes.
    Compressed chunks are read-only.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT decompress_chunk(%s);", (chunk_name,))
            print(f"Decompressed chunk: {chunk_name}")
```

---

## Data Retention Policies

Automatic data retention keeps your database size manageable by removing old data. Policies work at the chunk level for efficiency.

```python
# retention.py
# Managing data retention in TimescaleDB
from timescale_connection import get_connection

def setup_retention_policy(table_name: str, retention_period: str):
    """
    Set up automatic data retention policy.
    Drops entire chunks older than retention period.

    Args:
        table_name: Name of the hypertable
        retention_period: How long to keep data (e.g., '30 days', '1 year')
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Add retention policy
            # drop_after: Age at which chunks are dropped
            cur.execute("""
                SELECT add_retention_policy(
                    %s,
                    drop_after => INTERVAL %s
                );
            """, (table_name, retention_period))

            print(f"Retention policy set: {table_name} will drop data older than {retention_period}")

def remove_retention_policy(table_name: str):
    """Remove retention policy from a hypertable"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT remove_retention_policy(%s, if_exists => true);
            """, (table_name,))

            print(f"Retention policy removed from {table_name}")

def drop_old_chunks_manually(table_name: str, older_than: str):
    """
    Manually drop chunks older than specified interval.
    Useful for immediate cleanup without waiting for policy.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # drop_chunks returns info about dropped chunks
            cur.execute("""
                SELECT drop_chunks(
                    %s,
                    older_than => INTERVAL %s
                );
            """, (table_name, older_than))

            result = cur.fetchall()
            print(f"Dropped chunks: {result}")

def get_chunk_info(table_name: str):
    """
    Get information about all chunks for a hypertable.
    Useful for understanding data distribution and planning retention.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    chunk_name,
                    range_start,
                    range_end,
                    is_compressed,
                    pg_size_pretty(total_bytes) AS chunk_size
                FROM timescaledb_information.chunks
                WHERE hypertable_name = %s
                ORDER BY range_start DESC;
            """, (table_name,))

            return cur.fetchall()

def setup_tiered_retention():
    """
    Example of tiered retention with different policies.
    Raw data: 30 days
    Hourly aggregates: 1 year
    Daily aggregates: 5 years
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Raw data - shortest retention
            cur.execute("""
                SELECT add_retention_policy(
                    'sensor_data',
                    drop_after => INTERVAL '30 days',
                    if_not_exists => true
                );
            """)

            # Hourly aggregates - medium retention
            cur.execute("""
                SELECT add_retention_policy(
                    'sensor_hourly_stats',
                    drop_after => INTERVAL '1 year',
                    if_not_exists => true
                );
            """)

            # Daily aggregates - longest retention
            cur.execute("""
                SELECT add_retention_policy(
                    'sensor_daily_stats',
                    drop_after => INTERVAL '5 years',
                    if_not_exists => true
                );
            """)

            print("Tiered retention policies configured")
```

---

## SQLAlchemy Integration

SQLAlchemy provides an ORM interface for working with TimescaleDB. While raw SQL is often more efficient for time-series operations, SQLAlchemy can simplify application code.

```python
# sqlalchemy_integration.py
# Using SQLAlchemy with TimescaleDB
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

# Create SQLAlchemy engine with connection pool settings
engine = create_engine(
    "postgresql://postgres:password@localhost:5432/timeseries_db",
    pool_size=10,           # Number of connections to keep
    max_overflow=20,        # Additional connections allowed
    pool_pre_ping=True      # Verify connections before use
)

Base = declarative_base()
Session = sessionmaker(bind=engine)

class SensorReading(Base):
    """
    SQLAlchemy model for sensor readings.
    Maps to the sensor_data hypertable.
    """
    __tablename__ = 'sensor_data'

    # Composite primary key of time and sensor_id
    time = Column(DateTime(timezone=True), primary_key=True)
    sensor_id = Column(Integer, primary_key=True)
    temperature = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    location = Column(String)

    def __repr__(self):
        return f"<SensorReading(sensor={self.sensor_id}, time={self.time}, temp={self.temperature})>"

def insert_reading(sensor_id: int, temperature: float, humidity: float,
                   pressure: float, location: str):
    """Insert a single reading using SQLAlchemy ORM"""
    session = Session()
    try:
        reading = SensorReading(
            time=datetime.now(),
            sensor_id=sensor_id,
            temperature=temperature,
            humidity=humidity,
            pressure=pressure,
            location=location
        )
        session.add(reading)
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def query_recent_readings(sensor_id: int, hours: int = 24):
    """Query recent readings using SQLAlchemy"""
    session = Session()
    try:
        cutoff = datetime.now() - timedelta(hours=hours)

        readings = session.query(SensorReading)\
            .filter(SensorReading.sensor_id == sensor_id)\
            .filter(SensorReading.time > cutoff)\
            .order_by(SensorReading.time.desc())\
            .limit(1000)\
            .all()

        return readings
    finally:
        session.close()

def query_with_time_bucket(sensor_id: int, bucket_interval: str = '1 hour'):
    """
    Use TimescaleDB time_bucket with SQLAlchemy.
    Requires raw SQL for TimescaleDB-specific functions.
    """
    session = Session()
    try:
        # Use text() for raw SQL with TimescaleDB functions
        result = session.execute(text("""
            SELECT
                time_bucket(:interval, time) AS bucket,
                AVG(temperature) AS avg_temp,
                AVG(humidity) AS avg_humidity,
                COUNT(*) AS count
            FROM sensor_data
            WHERE sensor_id = :sensor_id
              AND time > NOW() - INTERVAL '7 days'
            GROUP BY bucket
            ORDER BY bucket DESC
        """), {"interval": bucket_interval, "sensor_id": sensor_id})

        return result.fetchall()
    finally:
        session.close()

def bulk_insert_readings(readings: list):
    """
    Bulk insert readings for better performance.
    Uses SQLAlchemy core for efficiency.
    """
    session = Session()
    try:
        # Convert to list of dicts for bulk insert
        reading_dicts = [
            {
                "time": r[0],
                "sensor_id": r[1],
                "temperature": r[2],
                "humidity": r[3],
                "pressure": r[4],
                "location": r[5]
            }
            for r in readings
        ]

        # Use bulk_insert_mappings for efficiency
        session.bulk_insert_mappings(SensorReading, reading_dicts)
        session.commit()
        print(f"Bulk inserted {len(readings)} readings")
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()
```

---

## Pandas Integration

Pandas integrates naturally with TimescaleDB for data analysis. The following examples show how to load time-series data into DataFrames and perform analysis.

```python
# pandas_integration.py
# Using pandas with TimescaleDB for data analysis
import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime, timedelta

# Create engine for pandas
engine = create_engine("postgresql://postgres:password@localhost:5432/timeseries_db")

def load_sensor_data_to_dataframe(sensor_id: int, days: int = 7) -> pd.DataFrame:
    """
    Load sensor data directly into a pandas DataFrame.
    Uses read_sql for efficient data transfer.
    """
    query = """
        SELECT time, temperature, humidity, pressure, location
        FROM sensor_data
        WHERE sensor_id = %(sensor_id)s
          AND time > NOW() - INTERVAL '%(days)s days'
        ORDER BY time
    """

    # read_sql handles connection and data type conversion
    df = pd.read_sql(
        query,
        engine,
        params={"sensor_id": sensor_id, "days": days},
        parse_dates=["time"],  # Parse time column as datetime
        index_col="time"       # Use time as index
    )

    return df

def load_aggregated_data(interval: str = '1 hour') -> pd.DataFrame:
    """
    Load pre-aggregated data using time_bucket.
    More efficient than aggregating in pandas.
    """
    query = f"""
        SELECT
            time_bucket('{interval}', time) AS bucket,
            sensor_id,
            AVG(temperature) AS avg_temp,
            AVG(humidity) AS avg_humidity,
            COUNT(*) AS reading_count
        FROM sensor_data
        WHERE time > NOW() - INTERVAL '7 days'
        GROUP BY bucket, sensor_id
        ORDER BY bucket, sensor_id
    """

    df = pd.read_sql(query, engine, parse_dates=["bucket"])
    return df

def analyze_sensor_data(df: pd.DataFrame) -> dict:
    """
    Perform statistical analysis on sensor data.
    Returns summary statistics and insights.
    """
    analysis = {
        "summary": df.describe(),
        "correlation": df[["temperature", "humidity", "pressure"]].corr(),
        "daily_pattern": df.groupby(df.index.hour).mean(),
        "missing_data": df.isnull().sum()
    }

    return analysis

def resample_and_analyze(df: pd.DataFrame, freq: str = '1H') -> pd.DataFrame:
    """
    Resample time-series data to different frequency.
    Useful for filling gaps or changing resolution.
    """
    # Resample to specified frequency
    resampled = df.resample(freq).agg({
        'temperature': ['mean', 'min', 'max', 'std'],
        'humidity': ['mean', 'min', 'max'],
        'pressure': 'mean'
    })

    # Flatten column names
    resampled.columns = ['_'.join(col).strip() for col in resampled.columns.values]

    return resampled

def save_dataframe_to_timescale(df: pd.DataFrame, table_name: str):
    """
    Save pandas DataFrame to TimescaleDB.
    Uses to_sql with appropriate settings for time-series data.
    """
    # Reset index if time is the index
    if df.index.name == 'time':
        df = df.reset_index()

    # to_sql handles data type mapping
    df.to_sql(
        table_name,
        engine,
        if_exists='append',  # Append to existing table
        index=False,
        method='multi',      # Use multi-row INSERT for speed
        chunksize=1000       # Batch size for inserts
    )

    print(f"Saved {len(df)} rows to {table_name}")

# Example analysis workflow
def run_analysis_workflow():
    """Complete analysis workflow example"""
    # Load data
    df = load_sensor_data_to_dataframe(sensor_id=1, days=7)
    print(f"Loaded {len(df)} readings")

    # Analyze
    analysis = analyze_sensor_data(df)
    print("\nSummary Statistics:")
    print(analysis["summary"])

    # Resample to hourly
    hourly = resample_and_analyze(df, freq='1H')
    print(f"\nHourly data: {len(hourly)} rows")

    # Find anomalies
    temp_mean = df['temperature'].mean()
    temp_std = df['temperature'].std()
    anomalies = df[abs(df['temperature'] - temp_mean) > 2 * temp_std]
    print(f"\nFound {len(anomalies)} temperature anomalies")

    return df, analysis

if __name__ == "__main__":
    run_analysis_workflow()
```

---

## Complete Application Example

The following example demonstrates a complete application that collects, stores, and analyzes IoT sensor data using TimescaleDB.

```python
# iot_monitoring_app.py
# Complete IoT monitoring application with TimescaleDB
import asyncio
import asyncpg
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
import json

@dataclass
class SensorConfig:
    """Configuration for a sensor"""
    sensor_id: int
    name: str
    location: str
    alert_thresholds: Dict[str, tuple]  # metric: (min, max)

class IoTMonitoringService:
    """
    Complete IoT monitoring service using TimescaleDB.
    Handles data collection, storage, analysis, and alerting.
    """

    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool: Optional[asyncpg.Pool] = None
        self.sensors: Dict[int, SensorConfig] = {}

    async def initialize(self):
        """Initialize database connection and schema"""
        # Create connection pool
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=5,
            max_size=20
        )

        # Set up database schema
        await self._setup_schema()
        await self._setup_continuous_aggregates()
        await self._setup_policies()

    async def _setup_schema(self):
        """Create necessary tables and hypertables"""
        async with self.pool.acquire() as conn:
            # Enable TimescaleDB
            await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

            # Create sensor readings table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    time        TIMESTAMPTZ NOT NULL,
                    sensor_id   INTEGER NOT NULL,
                    temperature DOUBLE PRECISION,
                    humidity    DOUBLE PRECISION,
                    pressure    DOUBLE PRECISION,
                    battery     DOUBLE PRECISION,
                    rssi        INTEGER
                );
            """)

            # Convert to hypertable
            await conn.execute("""
                SELECT create_hypertable(
                    'sensor_readings', 'time',
                    chunk_time_interval => INTERVAL '1 day',
                    if_not_exists => TRUE
                );
            """)

            # Create alerts table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sensor_alerts (
                    time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    sensor_id   INTEGER NOT NULL,
                    alert_type  TEXT NOT NULL,
                    message     TEXT,
                    value       DOUBLE PRECISION,
                    threshold   DOUBLE PRECISION
                );
            """)

            await conn.execute("""
                SELECT create_hypertable(
                    'sensor_alerts', 'time',
                    if_not_exists => TRUE
                );
            """)

    async def _setup_continuous_aggregates(self):
        """Set up continuous aggregates for efficient queries"""
        async with self.pool.acquire() as conn:
            # Hourly statistics aggregate
            await conn.execute("""
                CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_hourly_agg
                WITH (timescaledb.continuous) AS
                SELECT
                    time_bucket('1 hour', time) AS hour,
                    sensor_id,
                    AVG(temperature) AS avg_temp,
                    MIN(temperature) AS min_temp,
                    MAX(temperature) AS max_temp,
                    AVG(humidity) AS avg_humidity,
                    AVG(battery) AS avg_battery,
                    COUNT(*) AS readings
                FROM sensor_readings
                GROUP BY hour, sensor_id
                WITH NO DATA;
            """)

    async def _setup_policies(self):
        """Set up compression and retention policies"""
        async with self.pool.acquire() as conn:
            # Enable compression
            await conn.execute("""
                ALTER TABLE sensor_readings SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = 'sensor_id',
                    timescaledb.compress_orderby = 'time DESC'
                );
            """)

            # Compression policy - compress after 7 days
            await conn.execute("""
                SELECT add_compression_policy(
                    'sensor_readings',
                    compress_after => INTERVAL '7 days',
                    if_not_exists => true
                );
            """)

            # Retention policy - drop after 90 days
            await conn.execute("""
                SELECT add_retention_policy(
                    'sensor_readings',
                    drop_after => INTERVAL '90 days',
                    if_not_exists => true
                );
            """)

    def register_sensor(self, config: SensorConfig):
        """Register a sensor with alert thresholds"""
        self.sensors[config.sensor_id] = config

    async def record_reading(self, sensor_id: int, temperature: float,
                            humidity: float, pressure: float,
                            battery: float, rssi: int):
        """Record a sensor reading and check for alerts"""
        async with self.pool.acquire() as conn:
            # Insert reading
            await conn.execute("""
                INSERT INTO sensor_readings
                    (time, sensor_id, temperature, humidity, pressure, battery, rssi)
                VALUES (NOW(), $1, $2, $3, $4, $5, $6)
            """, sensor_id, temperature, humidity, pressure, battery, rssi)

        # Check thresholds and generate alerts
        await self._check_thresholds(sensor_id, {
            'temperature': temperature,
            'humidity': humidity,
            'battery': battery
        })

    async def record_batch(self, readings: List[tuple]):
        """Record multiple readings efficiently"""
        async with self.pool.acquire() as conn:
            await conn.copy_records_to_table(
                'sensor_readings',
                records=readings,
                columns=['time', 'sensor_id', 'temperature', 'humidity',
                        'pressure', 'battery', 'rssi']
            )

    async def _check_thresholds(self, sensor_id: int, values: Dict[str, float]):
        """Check values against thresholds and create alerts"""
        if sensor_id not in self.sensors:
            return

        config = self.sensors[sensor_id]
        alerts = []

        for metric, value in values.items():
            if metric in config.alert_thresholds:
                min_val, max_val = config.alert_thresholds[metric]

                if value < min_val:
                    alerts.append({
                        'sensor_id': sensor_id,
                        'alert_type': f'{metric}_low',
                        'message': f'{metric} below threshold',
                        'value': value,
                        'threshold': min_val
                    })
                elif value > max_val:
                    alerts.append({
                        'sensor_id': sensor_id,
                        'alert_type': f'{metric}_high',
                        'message': f'{metric} above threshold',
                        'value': value,
                        'threshold': max_val
                    })

        if alerts:
            await self._store_alerts(alerts)

    async def _store_alerts(self, alerts: List[Dict]):
        """Store generated alerts"""
        async with self.pool.acquire() as conn:
            for alert in alerts:
                await conn.execute("""
                    INSERT INTO sensor_alerts
                        (sensor_id, alert_type, message, value, threshold)
                    VALUES ($1, $2, $3, $4, $5)
                """, alert['sensor_id'], alert['alert_type'],
                   alert['message'], alert['value'], alert['threshold'])

    async def get_sensor_summary(self, sensor_id: int, hours: int = 24) -> Dict:
        """Get summary statistics for a sensor"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT
                    COUNT(*) AS reading_count,
                    AVG(temperature) AS avg_temp,
                    MIN(temperature) AS min_temp,
                    MAX(temperature) AS max_temp,
                    AVG(humidity) AS avg_humidity,
                    AVG(battery) AS avg_battery,
                    MIN(battery) AS min_battery
                FROM sensor_readings
                WHERE sensor_id = $1
                  AND time > NOW() - INTERVAL '1 hour' * $2
            """, sensor_id, hours)

            return dict(row)

    async def get_hourly_trends(self, sensor_id: int, days: int = 7) -> List[Dict]:
        """Get hourly trends from continuous aggregate"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT
                    hour,
                    avg_temp,
                    min_temp,
                    max_temp,
                    avg_humidity,
                    avg_battery,
                    readings
                FROM sensor_hourly_agg
                WHERE sensor_id = $1
                  AND hour > NOW() - INTERVAL '1 day' * $2
                ORDER BY hour DESC
            """, sensor_id, days)

            return [dict(row) for row in rows]

    async def get_recent_alerts(self, sensor_id: Optional[int] = None,
                                hours: int = 24) -> List[Dict]:
        """Get recent alerts, optionally filtered by sensor"""
        async with self.pool.acquire() as conn:
            if sensor_id:
                rows = await conn.fetch("""
                    SELECT time, sensor_id, alert_type, message, value, threshold
                    FROM sensor_alerts
                    WHERE sensor_id = $1
                      AND time > NOW() - INTERVAL '1 hour' * $2
                    ORDER BY time DESC
                    LIMIT 100
                """, sensor_id, hours)
            else:
                rows = await conn.fetch("""
                    SELECT time, sensor_id, alert_type, message, value, threshold
                    FROM sensor_alerts
                    WHERE time > NOW() - INTERVAL '1 hour' * $1
                    ORDER BY time DESC
                    LIMIT 100
                """, hours)

            return [dict(row) for row in rows]

    async def close(self):
        """Close database connections"""
        if self.pool:
            await self.pool.close()

# Example usage
async def main():
    # Initialize service
    service = IoTMonitoringService(
        "postgresql://postgres:password@localhost:5432/timeseries_db"
    )
    await service.initialize()

    # Register sensors with thresholds
    service.register_sensor(SensorConfig(
        sensor_id=1,
        name="Warehouse Sensor A",
        location="warehouse_a",
        alert_thresholds={
            'temperature': (15, 30),  # Alert if outside 15-30C
            'humidity': (30, 70),     # Alert if outside 30-70%
            'battery': (20, 100)      # Alert if battery below 20%
        }
    ))

    # Record a reading
    await service.record_reading(
        sensor_id=1,
        temperature=25.5,
        humidity=55.0,
        pressure=1013.25,
        battery=85.0,
        rssi=-65
    )

    # Get summary
    summary = await service.get_sensor_summary(1, hours=24)
    print(f"Sensor summary: {summary}")

    # Get trends
    trends = await service.get_hourly_trends(1, days=7)
    print(f"Found {len(trends)} hourly data points")

    await service.close()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Performance Best Practices

### Query Optimization Checklist

```mermaid
flowchart TD
    A[Slow Query?] --> B{Using time filter?}
    B -->|No| C[Add WHERE time > condition]
    B -->|Yes| D{Index exists?}
    D -->|No| E[Create composite index]
    D -->|Yes| F{Data compressed?}
    F -->|Yes| G{Querying recent data?}
    G -->|Yes| H[Query uncompressed chunks only]
    G -->|No| I[Consider continuous aggregate]
    F -->|No| J{High cardinality?}
    J -->|Yes| K[Use segment_by in compression]
    J -->|No| L[Check EXPLAIN ANALYZE]
```

### Performance Tips

The following best practices help optimize TimescaleDB performance for Python applications.

```python
# performance_tips.py
# TimescaleDB performance optimization examples
from timescale_connection import get_connection

def optimized_query_patterns():
    """Examples of optimized vs non-optimized queries"""

    with get_connection() as conn:
        with conn.cursor() as cur:
            # BAD: Full table scan
            # cur.execute("SELECT * FROM sensor_data WHERE sensor_id = 1")

            # GOOD: Time-bounded query enables chunk exclusion
            cur.execute("""
                SELECT * FROM sensor_data
                WHERE sensor_id = 1
                  AND time > NOW() - INTERVAL '1 day'
            """)

            # BAD: Counting all rows
            # cur.execute("SELECT COUNT(*) FROM sensor_data")

            # GOOD: Use approximate count for large tables
            cur.execute("""
                SELECT approximate_row_count('sensor_data')
            """)

            # BAD: ORDER BY on non-indexed column
            # cur.execute("SELECT * FROM sensor_data ORDER BY temperature")

            # GOOD: ORDER BY on indexed time column
            cur.execute("""
                SELECT * FROM sensor_data
                WHERE time > NOW() - INTERVAL '1 hour'
                ORDER BY time DESC
                LIMIT 100
            """)

def check_chunk_exclusion(query: str):
    """Check if a query benefits from chunk exclusion"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            # EXPLAIN shows which chunks are scanned
            cur.execute(f"EXPLAIN (ANALYZE, BUFFERS) {query}")
            plan = cur.fetchall()

            for row in plan:
                print(row[0])

def analyze_query_performance():
    """Analyze and optimize query performance"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Get hypertable statistics
            cur.execute("""
                SELECT
                    hypertable_name,
                    total_chunks,
                    compressed_chunks,
                    pg_size_pretty(total_bytes) AS total_size,
                    pg_size_pretty(compressed_bytes) AS compressed_size
                FROM timescaledb_information.hypertable_stats;
            """)

            stats = cur.fetchall()
            print("Hypertable Statistics:")
            for row in stats:
                print(f"  {row}")

            # Check for missing indexes
            cur.execute("""
                SELECT schemaname, tablename, indexname, indexdef
                FROM pg_indexes
                WHERE tablename LIKE '%sensor%';
            """)

            indexes = cur.fetchall()
            print("\nExisting Indexes:")
            for idx in indexes:
                print(f"  {idx[2]}: {idx[3]}")
```

---

## Conclusion

TimescaleDB provides a powerful foundation for time-series applications in Python. By leveraging hypertables for automatic partitioning, continuous aggregates for pre-computed analytics, and compression for storage efficiency, you can build scalable time-series solutions without leaving the familiar PostgreSQL ecosystem.

Key takeaways:
- Use hypertables for automatic time-based partitioning
- Leverage continuous aggregates for frequently-queried aggregations
- Enable compression for historical data to reduce storage costs
- Set up retention policies to automatically manage data lifecycle
- Use connection pooling and batch inserts for high-throughput applications

---

*Need to monitor your TimescaleDB instances? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring with automatic alerting for time-series workloads.*

**Related Reading:**
- [How to Build Health Checks and Readiness Probes in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [How to Implement Structured Logging in Python with OpenTelemetry](https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view)
