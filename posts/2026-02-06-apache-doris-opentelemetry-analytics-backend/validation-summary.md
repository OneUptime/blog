# Validation Summary: How to Use Apache Doris as an OpenTelemetry Analytics Backend

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Doris
- OpenTelemetry Collector
- OTLP HTTP
- Docker Compose
- Python
- Flask
- Grafana MySQL data source

## Sources Consulted
- Apache Doris 2.0 Docker deployment documentation: https://doris.apache.org/docs/2.0/install/cluster-deployment/run-docker-cluster
- Apache Doris Stream Load documentation: https://doris.apache.org/docs/2.0/data-operate/import/stream-load-manual/
- Apache Doris JSON load format documentation: https://doris.apache.org/docs/3.0/data-operate/import/file-format/json
- Apache Doris dynamic partitioning documentation: https://doris.apache.org/docs/2.0/table-design/data-partitioning/dynamic-partitioning/
- Apache Doris table model overview: https://doris.apache.org/docs/2.0/table-design/data-model/overview
- Apache Doris Aggregate model documentation: https://doris.apache.org/docs/dev/table-design/data-model/aggregate/
- Apache Doris PERCENTILE_APPROX documentation: https://doris.apache.org/docs/2.0/sql-manual/sql-functions/aggregate-functions/percentile-approx/
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- ClickHouse Keeper overview: https://clickhouse.com/clickhouse/keeper

## Issues Found
- The Docker Compose example used `apache/doris:2.0.3-fe` and `apache/doris:2.0.3-be`, but the official Doris 2.0.3 Docker examples use architecture-qualified tags such as `apache/doris:2.0.3-fe-x86_64` and `apache/doris:2.0.3-be-x86_64`. Updated both image tags.
- The Collector exporter examples used the deprecated `otlphttp` component alias. Updated them to `otlp_http`, which is the current component name in the Collector documentation.
- The Collector OTLP HTTP exporter defaults to protobuf encoding, but the Flask bridge reads JSON with `request.get_json()`. Added `encoding: json` to both OTLP HTTP exporters.
- The Doris Stream Load example omitted the documented `Expect: 100-continue` header. Added it to the Python bridge headers.
- The ClickHouse comparison said ClickHouse requires ZooKeeper. Updated the wording to account for ClickHouse Keeper as the current ZooKeeper-compatible coordination option.

## Review Notes
- The Python bridge is intentionally trace-focused even though the article also creates metric and log tables. The post would be stronger with matching metric and log bridge implementations, but the trace bridge is syntactically valid after the OTLP JSON encoding fix.
- The dynamic partition examples create current and future partitions by default. Doris does not create all historical partitions immediately unless `dynamic_partition.create_history_partition` is enabled, which is acceptable for this guide.
