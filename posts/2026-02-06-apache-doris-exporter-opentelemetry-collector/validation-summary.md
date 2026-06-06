# Validation Summary: How to Configure the Apache Doris Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Doris exporter
- Apache Doris
- Doris Stream Load
- Doris SQL
- OpenTelemetry Collector receivers and processors

## Sources Consulted
- OpenTelemetry Collector Contrib Doris exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/dorisexporter
- OpenTelemetry Collector Contrib Doris exporter configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/dorisexporter/config.go
- OpenTelemetry Collector Contrib Doris exporter DDL files: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/dorisexporter/sql
- Apache Doris OpenTelemetry integration documentation: https://doris.apache.org/docs/4.x/connection-integration/data-integration/opentelemetry/
- OpenTelemetry exporter helper queue/retry documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- OpenTelemetry filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- Apache Doris DATE_TRUNC documentation: https://doris.apache.org/docs/4.x/sql-manual/sql-functions/scalar-functions/date-time-functions/date-trunc
- Apache Doris percentile function documentation: https://doris.apache.org/docs/4.x/sql-manual/sql-functions/aggregate-functions/percentile/

## Issues Found
- The Doris exporter configuration used an invalid scalar `table` field. Updated examples to use `table.traces`, `table.metrics`, and `table.logs`.
- Several examples omitted `mysql_endpoint` while relying on automatic schema creation. Added `mysql_endpoint` where `create_schema: true` is used, and set `create_schema: false` where the post shows manually created tables.
- The post used unsupported `stream_load`, `channels`, exporter `compression`, `storage_type`, `endpoints`, and `load_balancing` fields. Replaced Stream Load tuning with documented `headers`, removed unsupported fields, and changed HA guidance to use a load balancer/DNS endpoint.
- Manual Doris table schemas did not match the exporter output. Updated traces/logs schemas to match the exporter fields and noted that metrics use type-specific table names derived from the metrics table prefix.
- The transform processor example used invalid OTTL functions for span timestamps and duplicated fields the exporter already writes. Removed that transform block from the traces pipeline.
- The filter processor example used the old nested `logs.exclude.record_attributes` style. Updated it to the current OTTL `log_conditions` format.
- Analytical SQL examples referenced old column names such as `start_time_unix_nano` and `duration_ms`, and used invalid `quantile_state(...)(...)` syntax. Updated them to use `timestamp`, `duration`, Doris `percentile`, and `date_trunc`.

## Review Notes
The Doris exporter is currently documented as alpha for traces, metrics, and logs, so users should check release notes before upgrading Collector Contrib versions. The YAML examples were parsed locally for syntax validity after edits; they were not run against a live Doris cluster.
