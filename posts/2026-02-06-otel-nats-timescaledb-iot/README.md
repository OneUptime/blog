# How to Set Up an OpenTelemetry + NATS + TimescaleDB Pipeline for IoT Telemetry at Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NATS, TimescaleDB, IoT

Description: Build a lightweight telemetry pipeline using OpenTelemetry, NATS messaging, and TimescaleDB for high-volume IoT device monitoring.

IoT telemetry has different requirements than typical application observability. You are dealing with millions of lightweight devices that send small messages at high frequency. Kafka is often overkill for this use case, both in terms of resource requirements and operational complexity. NATS, on the other hand, is a lightweight messaging system that handles millions of connections with minimal memory footprint. Paired with TimescaleDB for time-series storage, you get a pipeline that is both efficient and easy to run.

## Why NATS for IoT Telemetry

NATS uses about 10MB of RAM for the server process. Compare that to a Kafka broker that typically needs several gigabytes. For edge deployments or resource-constrained environments, this difference matters. NATS also supports JetStream for persistence, giving you durable message delivery when you need it.

## Architecture

```
IoT Devices -> NATS (JetStream) -> OTel Collector (NATS receiver) -> TimescaleDB
```

Devices publish metrics to NATS subjects. The OpenTelemetry Collector subscribes to those subjects and writes to TimescaleDB.

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
      permissions: { publish: "telemetry.>" } },
    { user: "collector", password: "$COLLECTOR_PASSWORD",
      permissions: { subscribe: "telemetry.>" } }
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

## OpenTelemetry Collector with NATS Receiver

Configure the Collector to consume from NATS and write to TimescaleDB:

```yaml
# collector-config.yaml
receivers:
  # NATS JetStream receiver
  nats:
    url: nats://collector:password@nats:4222
    subject: "telemetry.>"
    queue_group: otel-collectors
    jetstream:
      stream: TELEMETRY
      consumer: otel-collector
      durable: true
    encoding: otlp_json

exporters:
  postgresql:
    endpoint: postgresql://otel:password@timescaledb:5432/telemetry
    table_name: otel_metrics

processors:
  batch:
    send_batch_size: 5000
    timeout: 5s

  # Add processing timestamp
  resource:
    attributes:
      - key: pipeline.processed_at
        action: upsert
        value: "${HOSTNAME}"

service:
  pipelines:
    metrics:
      receivers: [nats]
      processors: [resource, batch]
      exporters: [postgresql]
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
