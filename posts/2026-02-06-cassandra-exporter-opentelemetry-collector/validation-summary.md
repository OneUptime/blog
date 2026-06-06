# Validation Summary: How to Configure the Cassandra Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Cassandra exporter
- Apache Cassandra
- CQL
- Python Cassandra driver
- OpenTelemetry Collector batch processor and internal telemetry

## Sources Consulted
- OpenTelemetry Collector exporter list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Cassandra exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/cassandraexporter/README.md
- OpenTelemetry Collector Cassandra exporter config schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/cassandraexporter/config.schema.yaml
- OpenTelemetry Collector Cassandra exporter implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/cassandraexporter
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Apache Cassandra replication strategy docs: https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- Apache Cassandra CQL docs for prepared statements and bind markers: https://cassandra.apache.org/doc/latest/cassandra/developing/cql/cql_singlefile.html
- Apache Cassandra CREATE TABLE docs: https://cassandra.apache.org/doc/latest/cassandra/reference/cql-commands/create-table.html

## Issues Found
- The original post described unsupported exporter settings including `endpoints`, `table`, `consistency`, `num_connections`, `mapping`, `tls`, `ttl`, `prepared_statements`, exporter-specific `batch`, `retry_policy`, and `load_balancing`. Replaced examples with supported settings: `dsn`, `port`, `timeout`, `keyspace`, `trace_table`, `logs_table`, `replication`, `compression`, and `auth`.
- The original post claimed the Cassandra exporter writes traces, metrics, and logs. Corrected this to traces and logs only, matching the current alpha signal support.
- The original schema examples used custom trace, metric, and log tables that do not match the exporter implementation. Replaced them with the exporter-created trace/log schema shape and removed the unsupported metrics table.
- The original multiple-pipeline example configured a Cassandra metrics exporter and arbitrary field mappings. Replaced it with separate trace/log exporter instances and noted that metrics require another exporter.
- The original secure configuration included unsupported TLS fields and an unsupported `auth.type`. Replaced it with the supported username/password `auth` block and environment variable syntax.
- The original consistency-level section implied the exporter can configure Cassandra consistency per pipeline. Corrected it to explain Cassandra consistency generally and note that the exporter currently sets QUORUM internally.
- The original TTL section used an unsupported exporter `ttl` block. Replaced it with Cassandra table-level `default_time_to_live` CQL.
- The original batching/prepared statement, multi-datacenter, compression, and token-aware routing sections described unsupported exporter options. Reworked them to use only supported Collector/exporter settings and documented current limitations.
- The original Python query example queried non-existent/custom columns and a metrics table. Replaced it with queries against the generated trace and log tables by `spanid`.
- The original monitoring example used unsupported Cassandra exporter fields and older internal metrics address configuration. Updated the example to supported exporter fields and current `service.telemetry.metrics.level` usage.

## Review Notes
The Cassandra exporter is alpha and has a limited configuration surface. Production users should validate schema creation, retention, and Cassandra topology behavior in their own environment before adopting it for long-term telemetry storage.
