# How to Set Up an OpenTelemetry + NATS + TimescaleDB Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NATS, TimescaleDB, IoT

Description: Build a lightweight telemetry pipeline using OpenTelemetry, NATS messaging, and TimescaleDB for high-volume IoT device monitoring.

IoT telemetry has different requirements than typical application observability. You are dealing with millions of lightweight devices that send small messages at high frequency. Kafka is often overkill for this use case, both in terms of resource requirements and operational complexity. NATS, on the other hand, is a lightweight messaging system that handles millions of connections with minimal memory footprint. Paired with TimescaleDB for time-series storage, you get a pipeline that is both efficient and easy to run.

## Why NATS for IoT Telemetry

The NATS server is a compact single binary with minimal CPU and memory requirements for small deployments. Compare that to a Kafka broker that typically needs a JVM, page cache, and more operational headroom. For edge deployments or resource-constrained environments, this difference matters. NATS also supports JetStream for persistence, giving you durable message delivery when you need it.

## Architecture

```text
IoT Devices -> NATS (JetStream) -> NATS Consumer -> TimescaleDB
```

Devices publish OTLP JSON metrics to NATS subjects. A small consumer subscribes to those subjects, extracts the metric points, and writes them to TimescaleDB.

## NATS Server Configuration

Set up NATS with JetStream enabled for durable message storage:

```conf
# nats-server.conf

server_name: iot-nats

# Listen on all interfaces
listen: 0.0.0.0:4222

# Enable JetStream with persistent storage
jetstream {
  store_dir: /data/nats
  max_mem: 1G
  max_file: 100G
}

# Authorization for IoT devices
authorization {
  users = [
    { user: "device", password: "$DEVICE_PASSWORD",
      permissions: {
        publish: "telemetry.>",
        subscribe: "_INBOX.>"
      } },
    { user: "collector", password: "$COLLECTOR_PASSWORD",
      permissions: {
        publish: [
          "$JS.API.CONSUMER.>",
          "$JS.ACK.TELEMETRY.timescaledb-writer.>"
        ],
        subscribe: "_INBOX.>"
      } }
  ]
}

# Cluster configuration for high availability
cluster {
  name: iot-nats-cluster
  listen: 0.0.0.0:6222
  routes: [
    nats-route://nats-2:6222
    nats-route://nats-3:6222
  ]
}
```

Create JetStream streams for telemetry:

```bash
# Create a stream for device telemetry
nats stream add TELEMETRY \
  --subjects "telemetry.>" \
  --retention limits \
  --max-age 48h \
  --max-bytes 50GB \
  --storage file \
  --replicas 3 \
  --discard old
```

## IoT Device Instrumentation

Here is a lightweight Python client for an IoT device that publishes metrics via NATS:

```python
# iot_device.py
import nats
import json
import asyncio
import time
import os

DEVICE_ID = os.getenv("DEVICE_ID", "sensor-001")
NATS_URL = os.getenv("NATS_URL", "nats://device:password@nats:4222")

async def publish_telemetry():
    nc = await nats.connect(NATS_URL)
    js = nc.jetstream()

    while True:
        # Read sensor data
        temperature = read_temperature_sensor()
        humidity = read_humidity_sensor()
        battery_level = read_battery_level()

        # Format as OTLP-compatible metric
        payload = {
            "resourceMetrics": [{
                "resource": {
                    "attributes": [
                        {"key": "service.name",
                         "value": {"stringValue": "iot-sensor"}},
                        {"key": "device.id",
                         "value": {"stringValue": DEVICE_ID}},
                        {"key": "device.location",
                         "value": {"stringValue": "warehouse-a"}}
                    ]
                },
                "scopeMetrics": [{
                    "metrics": [
                        {
                            "name": "device.temperature",
                            "unit": "Cel",
                            "gauge": {
                                "dataPoints": [{
                                    "timeUnixNano": str(time.time_ns()),
                                    "asDouble": temperature
                                }]
                            }
                        },
                        {
                            "name": "device.humidity",
                            "unit": "%",
                            "gauge": {
                                "dataPoints": [{
                                    "timeUnixNano": str(time.time_ns()),
                                    "asDouble": humidity
                                }]
                            }
                        },
                        {
                            "name": "device.battery",
                            "unit": "%",
                            "gauge": {
                                "dataPoints": [{
                                    "timeUnixNano": str(time.time_ns()),
                                    "asDouble": battery_level
                                }]
                            }
                        }
                    ]
                }]
            }]
        }

        # Publish to NATS subject based on device location
        subject = f"telemetry.metrics.{DEVICE_ID}"
        await js.publish(subject, json.dumps(payload).encode())

        # Send every 10 seconds
        await asyncio.sleep(10)

asyncio.run(publish_telemetry())
```

## NATS-to-TimescaleDB Consumer

The official OpenTelemetry Collector distributions do not currently include a NATS receiver or a PostgreSQL/TimescaleDB metrics exporter. Use a small consumer process to read the OTLP JSON payloads from JetStream and write them to TimescaleDB:

```python
# nats_to_timescaledb.py
import asyncio
import json
import os
from datetime import datetime, timezone

import nats
import psycopg
from nats.errors import TimeoutError

NATS_URL = os.getenv("NATS_URL", "nats://collector:password@nats:4222")
POSTGRES_DSN = os.getenv(
    "POSTGRES_DSN",
    "postgresql://otel:password@timescaledb:5432/telemetry",
)


def otlp_value(attribute):
    value = attribute.get("value", {})
    for key in ("stringValue", "intValue", "doubleValue", "boolValue"):
        if key in value:
            return value[key]
    return None


def resource_attributes(resource):
    return {
        attribute["key"]: otlp_value(attribute)
        for attribute in resource.get("attributes", [])
    }


def metric_rows(payload):
    for resource_metric in payload.get("resourceMetrics", []):
        attributes = resource_attributes(resource_metric.get("resource", {}))
        device_id = attributes.get("device.id", "unknown")
        location = attributes.get("device.location", "unknown")

        for scope_metric in resource_metric.get("scopeMetrics", []):
            for metric in scope_metric.get("metrics", []):
                points = metric.get("gauge", {}).get("dataPoints", [])
                for point in points:
                    value = point.get("asDouble", point.get("asInt"))
                    timestamp_ns = int(point["timeUnixNano"])
                    yield (
                        datetime.fromtimestamp(
                            timestamp_ns / 1_000_000_000,
                            tz=timezone.utc,
                        ),
                        device_id,
                        location,
                        metric["name"],
                        float(value),
                        metric.get("unit"),
                    )


async def main():
    nc = await nats.connect(NATS_URL)
    js = nc.jetstream()
    subscription = await js.pull_subscribe(
        "telemetry.>",
        durable="timescaledb-writer",
        stream="TELEMETRY",
    )

    async with await psycopg.AsyncConnection.connect(POSTGRES_DSN) as conn:
        while True:
            try:
                messages = await subscription.fetch(100, timeout=1)
            except TimeoutError:
                continue

            for message in messages:
                rows = list(metric_rows(json.loads(message.data)))
                if rows:
                    async with conn.cursor() as cursor:
                        await cursor.executemany(
                            """
                            INSERT INTO iot_metrics
                                (time, device_id, location, metric_name, value, unit)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            """,
                            rows,
                        )
                    await conn.commit()
                await message.ack()


asyncio.run(main())
```

## TimescaleDB Schema

Set up TimescaleDB with hypertables for efficient time-series storage:

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create the metrics table
CREATE TABLE iot_metrics (
    time TIMESTAMPTZ NOT NULL,
    device_id TEXT NOT NULL,
    location TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit TEXT
);

-- Convert to hypertable with 1-hour chunks
SELECT create_hypertable('iot_metrics', 'time',
    chunk_time_interval => INTERVAL '1 hour');

-- Create indexes for common query patterns
CREATE INDEX idx_device_time ON iot_metrics (device_id, time DESC);
CREATE INDEX idx_location_metric ON iot_metrics (location, metric_name, time DESC);

-- Set up continuous aggregates for dashboard queries
CREATE MATERIALIZED VIEW iot_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    device_id,
    location,
    metric_name,
    avg(value) AS avg_value,
    min(value) AS min_value,
    max(value) AS max_value,
    count(*) AS sample_count
FROM iot_metrics
GROUP BY bucket, device_id, location, metric_name;

-- Retention policy: raw data for 7 days, hourly aggregates for 1 year
SELECT add_retention_policy('iot_metrics', INTERVAL '7 days');
SELECT add_retention_policy('iot_metrics_hourly', INTERVAL '365 days');
```

## Querying IoT Data

```sql
-- Find devices with abnormal temperature in the last hour
SELECT device_id, location, avg(value) as avg_temp
FROM iot_metrics
WHERE metric_name = 'device.temperature'
  AND time > now() - INTERVAL '1 hour'
GROUP BY device_id, location
HAVING avg(value) > 35.0
ORDER BY avg_temp DESC;
```

## Wrapping Up

The NATS + OpenTelemetry + TimescaleDB stack is a lightweight alternative to Kafka-based pipelines for IoT telemetry. NATS keeps the messaging layer simple and resource-efficient, while TimescaleDB's continuous aggregates give you pre-computed analytics without running a separate processing engine. This combination works well from hundreds to millions of devices.
