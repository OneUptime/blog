# How to Build an OpenTelemetry Pipeline with Apache Pulsar for Multi-Region Telemetry Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Apache Pulsar, Multi-Region, Distributed Systems

Description: Build a multi-region telemetry distribution pipeline using OpenTelemetry and Apache Pulsar's geo-replication capabilities.

Apache Pulsar has a feature that Kafka does not: built-in geo-replication. This makes it an excellent choice for organizations that run services across multiple regions and need telemetry data available in each region for local querying while also maintaining a global view. This post shows how to build a multi-region OpenTelemetry pipeline using Pulsar.

## Why Pulsar Over Kafka for Multi-Region

Kafka can do multi-region with MirrorMaker, but it is bolted on and hard to manage. Pulsar's geo-replication is a first-class feature: you configure it at the namespace level, and Pulsar handles the rest. Messages published in one region automatically appear in all other regions with low latency.

## Architecture

```
Region US-East:
  Apps -> OTel Collector -> Pulsar (us-east cluster) -> Local Backend

Region EU-West:
  Apps -> OTel Collector -> Pulsar (eu-west cluster) -> Local Backend

Region AP-South:
  Apps -> OTel Collector -> Pulsar (ap-south cluster) -> Local Backend

Pulsar geo-replication syncs between all three clusters
```

Each region has its own Pulsar cluster and backend. Geo-replication ensures that every region has a complete copy of all telemetry data.

## Pulsar Cluster Setup

First, configure geo-replication between your Pulsar clusters:

```bash
# Register clusters with each other
pulsar-admin clusters create us-east \
  --url http://pulsar-us-east:8080 \
  --broker-url pulsar://pulsar-us-east:6650

pulsar-admin clusters create eu-west \
  --url http://pulsar-eu-west:8080 \
  --broker-url pulsar://pulsar-eu-west:6650

pulsar-admin clusters create ap-south \
  --url http://pulsar-ap-south:8080 \
  --broker-url pulsar://pulsar-ap-south:6650

# Create a tenant for telemetry
pulsar-admin tenants create observability \
  --allowed-clusters us-east,eu-west,ap-south

# Create a namespace with geo-replication enabled
pulsar-admin namespaces create observability/telemetry
pulsar-admin namespaces set-clusters observability/telemetry \
  --clusters us-east,eu-west,ap-south

# Set retention policy
pulsar-admin namespaces set-retention observability/telemetry \
  --size 500G --time 72h
```

## OpenTelemetry Collector Configuration

Since the OpenTelemetry Collector does not have a native Pulsar exporter, we use the OTLP exporter to send to a small bridge service, or we use the Collector's HTTP exporter with Pulsar's HTTP endpoint. A cleaner approach is to use the community Pulsar exporter:

```yaml
# collector-config.yaml (per region)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  pulsar:
    endpoint: pulsar://pulsar-local:6650
    topic: persistent://observability/telemetry/otel-traces
    encoding: otlp_proto
    # TLS configuration for production
    tls_trust_certs_file: /etc/ssl/certs/pulsar-ca.pem
    auth:
      token: ${env:PULSAR_TOKEN}

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

  # Tag telemetry with its source region
  resource:
    attributes:
      - key: telemetry.source.region
        value: us-east
        action: upsert

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [pulsar]
```

## Bridge Service Approach

If you cannot use the contrib Pulsar exporter, build a small bridge that accepts OTLP and publishes to Pulsar:

```python
# pulsar_bridge.py
import pulsar
from flask import Flask, request
import json

app = Flask(__name__)

# Create Pulsar client and producers
client = pulsar.Client("pulsar://pulsar-local:6650")
traces_producer = client.create_producer(
    "persistent://observability/telemetry/otel-traces",
    compression_type=pulsar.CompressionType.ZSTD,
    batching_enabled=True,
    batching_max_publish_delay_ms=10,
    # Partition by trace ID for ordering
    routing_mode=pulsar.PartitionRoutingMode.UseSinglePartition
)

@app.route("/v1/traces", methods=["POST"])
def receive_traces():
    """Receive OTLP traces and forward to Pulsar."""
    data = request.get_data()
    content_type = request.content_type

    if "protobuf" in content_type:
        # Forward raw protobuf
        traces_producer.send(data)
    else:
        # Forward JSON
        traces_producer.send(data)

    return "", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4319)
```

## Consuming in Each Region

Each region runs a consumer that reads from its local Pulsar cluster and forwards to the local backend:

```yaml
# consumer-collector.yaml
receivers:
  # Custom receiver or use Pulsar receiver from contrib
  pulsar:
    endpoint: pulsar://pulsar-local:6650
    topic: persistent://observability/telemetry/otel-traces
    subscription: local-backend-consumer
    encoding: otlp_proto

exporters:
  otlphttp:
    endpoint: https://local-backend:4318

processors:
  batch:
    send_batch_size: 8192
    timeout: 2s

  # Optionally filter to only process data from specific regions
  filter/local_only:
    traces:
      span:
        - 'resource.attributes["telemetry.source.region"] != "us-east"'

service:
  pipelines:
    # Pipeline for all data (global view)
    traces/all:
      receivers: [pulsar]
      processors: [batch]
      exporters: [otlphttp]
```

## Handling Region-Specific Queries

With geo-replication, each region has all the data. But you might want to query region-specific data for latency-sensitive dashboards:

```sql
-- Query only local region traces (fast, low latency)
SELECT service_name, p99_duration_ms
FROM traces
WHERE source_region = 'us-east'
  AND timestamp > now() - INTERVAL 1 HOUR;

-- Query global traces (complete but potentially higher latency)
SELECT service_name, source_region, count(*) as span_count
FROM traces
WHERE timestamp > now() - INTERVAL 1 HOUR
GROUP BY service_name, source_region;
```

## Wrapping Up

Apache Pulsar's native geo-replication makes multi-region telemetry distribution straightforward. Instead of managing complex mirroring setups, you configure replication at the namespace level and Pulsar handles the rest. Each region gets a local copy of all telemetry data, giving you low-latency queries for local data and a global view when you need it.
