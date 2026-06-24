# How to Deploy TimescaleDB via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, TimescaleDB, PostgreSQL, Time Series, Database, Metric

Description: Learn how to deploy TimescaleDB via Portainer for time-series workloads using PostgreSQL-compatible hypertables and automatic data compression.

---

TimescaleDB is a PostgreSQL extension that adds hypertables, automatic partitioning, and columnstore compression for time-series workloads. Because it runs as a PostgreSQL extension, existing PostgreSQL clients and tools continue to work with your time-series data.

## Stack Definition

```yaml
services:
  timescaledb:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: metrics
    ports:
      - "5432:5432"
    volumes:
      - timescale_data:/var/lib/postgresql/data
    networks:
      - tsdb_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d metrics"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: adminpassword
    ports:
      - "5050:80"
    networks:
      - tsdb_net
    depends_on:
      timescaledb:
        condition: service_healthy

volumes:
  timescale_data:

networks:
  tsdb_net:
    driver: bridge
```

## Initialization SQL

After the stack is running, connect to the `metrics` database in pgAdmin and run:

```sql
-- Enable the TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create a metrics hypertable
CREATE TABLE IF NOT EXISTS sensor_readings (
    time        TIMESTAMPTZ       NOT NULL,
    sensor_id   TEXT              NOT NULL,
    location    TEXT              NOT NULL,
    temperature DOUBLE PRECISION  NULL,
    humidity    DOUBLE PRECISION  NULL
) WITH (
    tsdb.hypertable,
    tsdb.partition_column = 'time',
    tsdb.segmentby = 'sensor_id',
    tsdb.orderby = 'time DESC'
);

-- Create an index for fast queries by sensor
CREATE INDEX IF NOT EXISTS sensor_readings_sensor_id_time_idx
    ON sensor_readings (sensor_id, time DESC);
```

## Inserting and Querying Time-Series Data

Use SQL plus TimescaleDB functions to interact with hypertables:

```sql
-- Insert sensor readings
INSERT INTO sensor_readings (time, sensor_id, location, temperature, humidity)
VALUES
    (NOW(), 'sensor-001', 'server-room', 22.5, 45.2),
    (NOW() - INTERVAL '5 minutes', 'sensor-001', 'server-room', 23.1, 44.8);

-- Query the last hour of readings with 5-minute averages
SELECT
    time_bucket('5 minutes', time) AS bucket,
    sensor_id,
    AVG(temperature) AS avg_temp,
    AVG(humidity)    AS avg_humidity
FROM sensor_readings
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY bucket, sensor_id
ORDER BY bucket DESC;
```

## Configuring Automatic Columnstore Conversion

Set the automatic columnstore policy to convert chunks older than 7 days:

```sql
-- Replace the default policy with a 7-day columnstore policy
CALL remove_columnstore_policy('sensor_readings', if_exists => true);
CALL add_columnstore_policy('sensor_readings', after => INTERVAL '7 days');
```

## Data Retention Policy

Automatically drop data older than 90 days:

```sql
SELECT add_retention_policy('sensor_readings', drop_after => INTERVAL '90 days', if_not_exists => true);
```

## Connecting a Python Application

Use `psycopg2` or `asyncpg` since TimescaleDB is PostgreSQL-compatible. If your Python application runs on the same Docker network, you can use the service name as the host:

```python
import psycopg2
from datetime import datetime, timezone

conn = psycopg2.connect(
    host="timescaledb",
    port=5432,
    dbname="metrics",
    user="postgres",
    password="postgrespassword"
)

cur = conn.cursor()
cur.execute(
    "INSERT INTO sensor_readings (time, sensor_id, location, temperature) VALUES (%s, %s, %s, %s)",
    (datetime.now(timezone.utc), "sensor-001", "server-room", 22.5)
)
conn.commit()
```

## Grafana Integration

TimescaleDB works with the standard Grafana PostgreSQL data source. Add it with:

- Host: `timescaledb:5432` if Grafana runs on the same Docker network, or `localhost:5432` from the Docker host
- Database: `metrics`
- User/Password: as configured
- TLS mode: disable (for an internal Docker network or local development)

Use time-series panels with `$__timeFilter(time)` macros for automatic time range filtering.
