# Validation Summary: How to Set Up an OpenTelemetry + NATS + TimescaleDB Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry OTLP JSON
- NATS and JetStream
- Python
- TimescaleDB
- PostgreSQL

## Sources Consulted
- OpenTelemetry Collector receivers registry: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector exporters registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- NATS server configuration docs: https://docs.nats.io/running-a-nats-service/configuration
- NATS JetStream configuration docs: https://docs.nats.io/running-a-nats-service/configuration/resource_management
- NATS authorization docs: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/authorization
- NATS JetStream wire API reference: https://docs.nats.io/reference/reference-protocols/nats_api_reference
- NATS streams docs: https://docs.nats.io/nats-concepts/jetstream/streams
- NATS Python client docs: https://github.com/nats-io/nats.py
- TimescaleDB create_hypertable docs: https://docs.timescale.com/api/latest/hypertable/create_hypertable/
- TimescaleDB add_retention_policy docs: https://docs.timescale.com/api/latest/data-retention/add_retention_policy/
- Psycopg async API docs: https://www.psycopg.org/psycopg3/docs/advanced/async.html

## Issues Found
- The post claimed the official OpenTelemetry Collector could consume from NATS with an `nats` receiver and export metrics directly to PostgreSQL/TimescaleDB with a `postgresql` exporter. The official Collector component registries do not list those components, so the architecture and Collector configuration would not run. I replaced that section with a small Python JetStream consumer that reads OTLP JSON payloads and inserts metric rows into the TimescaleDB table.
- The original NATS authorization snippet granted only `telemetry.>` publish/subscribe permissions. JetStream publish and pull-consumer APIs also require request/reply inbox and JetStream API subject access, so I updated the permissions for the device and consumer users.
- The post gave a fixed claim that NATS uses about 10MB of RAM. Official NATS documentation supports the broader claim that the server is a compact binary with minimal resource requirements, but exact memory use depends on workload, JetStream storage, and clustering. I changed the wording to avoid an invalid sizing guarantee.
- The original Collector exporter wrote to `otel_metrics`, while the schema created `iot_metrics`. The replacement consumer writes to `iot_metrics`, matching the schema and query examples.

## Review Notes
The OTLP JSON payload structure uses lowerCamelCase field names and decimal-string nanosecond timestamps, which matches the OTLP JSON encoding rules. The Python snippets were syntax-checked with `python3` after editing. The sensor read functions remain placeholders, which is acceptable for a focused instrumentation example.
