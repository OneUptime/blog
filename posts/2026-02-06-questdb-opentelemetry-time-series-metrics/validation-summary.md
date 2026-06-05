# Validation Summary: How to Use QuestDB for OpenTelemetry Time-Series Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- QuestDB
- OpenTelemetry Collector
- OTLP HTTP
- InfluxDB Line Protocol
- Docker Compose
- Python
- Flask
- SQL
- Grafana

## Sources Consulted
- QuestDB Docker documentation: https://questdb.com/docs/get-started/docker
- QuestDB ILP overview: https://questdb.com/docs/reference/api/ilp/overview
- QuestDB CREATE TABLE reference: https://questdb.com/docs/reference/sql/create-table/
- QuestDB deduplication documentation: https://questdb.com/docs/concepts/deduplication/
- QuestDB configuration reference: https://questdb.com/docs/configuration/
- QuestDB monitoring and health check documentation: https://questdb.com/docs/operations/monitoring-alerting/
- QuestDB data retention documentation: https://questdb.com/docs/operations/data-retention/
- QuestDB Grafana integration documentation: https://questdb.com/docs/integrations/visualization/grafana/
- Grafana QuestDB data source plugin documentation: https://grafana.com/grafana/plugins/questdb-questdb-datasource/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector InfluxDB exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/influxdbexporter/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector hostmetrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Flask API documentation: https://flask.palletsprojects.com/

## Issues Found
- The original architecture claimed that the OpenTelemetry Collector could export directly to QuestDB over ILP/TCP using the InfluxDB exporter. The Collector InfluxDB exporter is HTTP-based, requires InfluxDB-style configuration fields, and writes data using its own schema rather than the `otel_metrics` schema shown in the post. I changed the architecture to use the Collector's OTLP HTTP exporter with JSON encoding and a bridge service that writes the explicit QuestDB table via ILP/TCP.
- The Collector configuration used invalid or inappropriate InfluxDB exporter fields for this QuestDB table, including `endpoint: http://localhost:9009` and `payload_type: influx`. I replaced it with `otlp_http/questdb_bridge`, `endpoint: http://localhost:4319`, and `encoding: json`, matching the documented OTLP HTTP exporter configuration.
- The `attributes` processor actions used `upsert` without a value source, which would not create useful QuestDB columns. I removed that processor and handled resource attribute mapping in the bridge code.
- The Python bridge comment said it used the QuestDB Python client, but the code used raw sockets. I corrected the comment and updated the bridge to escape ILP tag values, write `metric_name`, `service_name`, `host_name`, and `environment` tags, write `count=1i`, and handle both gauge and sum metric data points.
- The QuestDB health check command used `/healthcheck` and expected `{"status":"healthy"}`. QuestDB's documented minimal health check is on port `9003` at the root path and returns an OK response, so I corrected the command and expected output.
- The Docker example used `questdb/questdb:7.4.0`, which is outdated for a 2026 post. I updated it to `questdb/questdb:9.4.0`, matching current QuestDB documentation.
- The Docker environment included `QDB_CAIRO_COMMIT_LAG`, which is not a current documented QuestDB configuration property. I removed it and updated the performance tuning section accordingly.
- The post described ILP/TCP as the best ingestion protocol. Current QuestDB documentation recommends ILP/HTTP for most production ingestion because it provides error feedback and retry behavior, while TCP is lower-overhead but more limited. I corrected that explanation.
- The `SYMBOL` explanation called it an indexed string type. QuestDB symbols are dictionary-encoded strings and are not automatically indexed just because they are symbols. I corrected the wording.
- The anomaly SQL query used a correlated aggregate and aliases in `HAVING` in a way that is less robust for QuestDB. I rewrote it using documented CTE and JOIN syntax.
- The Grafana section used the generic PostgreSQL data source and `SAMPLE BY $__interval`. QuestDB recommends the official QuestDB data source plugin, and the plugin documents `$__sampleByInterval` for `SAMPLE BY` because `$__interval` can use units incompatible with QuestDB. I updated the provisioning YAML and query macro.

## Review Notes
- The bridge is intentionally minimal and handles gauge and sum metrics only. Histogram and summary metrics would need additional mapping if this guide is expanded later.
- The bridge opens a TCP connection per data point for clarity. A production implementation should batch and reuse connections or use an official QuestDB client.
