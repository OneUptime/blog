# Validation Summary: How to Use Apache Druid for OpenTelemetry Metrics Analytics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Druid
- OpenTelemetry Collector
- OpenTelemetry Protocol JSON
- Apache Kafka
- Docker Compose
- Grafana Druid data source plugin
- Druid SQL

## Sources Consulted
- Apache Druid Docker quickstart: https://druid.apache.org/docs/latest/tutorials/docker/
- Apache Druid single-server deployment docs: https://druid.apache.org/docs/latest/operations/single-server/
- Apache Druid Kafka ingestion docs: https://druid.apache.org/docs/latest/ingestion/kafka-ingestion/
- Apache Druid supervisor spec docs: https://druid.apache.org/docs/latest/ingestion/supervisor/
- Apache Druid ingestion spec docs: https://druid.apache.org/docs/latest/ingestion/ingestion-spec/
- Apache Druid source input formats / flattenSpec docs: https://druid.apache.org/docs/latest/ingestion/data-formats/
- Apache Druid segment storage docs: https://druid.apache.org/docs/latest/design/segments/
- Apache Druid downloads page for current stable version: https://druid.apache.org/downloads/
- OpenTelemetry Collector Kafka exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Protocol file exporter JSON example: https://opentelemetry.io/docs/specs/otel/protocol/file-exporter/
- Grafana Druid data source plugin page: https://grafana.com/grafana/plugins/grafadruid-druid-datasource/

## Issues Found
- The original Docker Compose snippet used a single `apache/druid` service without a Druid service command. The official Druid Docker entrypoint expects commands such as `coordinator`, `broker`, `historical`, `middleManager`, or `router`, so the snippet would not start the Druid processes as written. Replaced it with an official-pattern development Compose setup using separate Druid service containers, shared Druid configuration, PostgreSQL metadata storage, ZooKeeper, Kafka, and the current stable `apache/druid:37.0.0` image.
- The original Druid configuration did not configure ZooKeeper, metadata storage, or local deep storage for the Druid services. Added `druid_zk_service_host`, PostgreSQL metadata storage settings, local segment storage, indexing log storage, and the required `postgresql-metadata-storage` extension.
- The Kafka listener configuration was incomplete for a host-and-container Compose topology. Added explicit `KAFKA_LISTENERS` and `KAFKA_INTER_BROKER_LISTENER_NAME` values so Kafka advertises `kafka:29092` to Druid containers and `localhost:9092` to host tools.
- The post claimed Druid automatically indexes every column. Druid creates bitmap indexes for string dimensions and related indexed columns, while other column types may be scanned. Updated the wording to describe bitmap indexes on dimensions accurately.
- The post implied Druid could ingest arbitrary OTLP JSON batches directly as metric rows. The shown flattenSpec extracts only the first gauge data point from each OTLP JSON message and does not explode batched metrics into multiple Druid rows. Added a caveat that production pipelines should flatten OTLP batches into one metric data point per Kafka message before this supervisor.
- The `service_name` flattenSpec used a JSONPath filter that can return an array-like result. Changed it to a `jq` flatten field that selects the `service.name` attribute value directly.
- The rollup explanation said sum, min, max, and count support percentiles at query time. Those aggregators support averages, peaks, and counts, but not percentiles. Updated the explanation accordingly.
- The SQL examples were missing statement terminators and labeled rolled-up row count as `segment_count`. Added semicolons and renamed the alias to `rolled_rows`.
- The summary repeated the inaccurate automatic indexing claim. Updated it to describe bitmap indexes on dimensions.

## Review Notes
The corrected Druid supervisor is still a minimal gauge-only example. It is technically accurate with the added caveat, but a production OpenTelemetry metrics pipeline should flatten all resource, scope, metric, and data point arrays and handle sums, histograms, summaries, exemplars, and metric attributes explicitly before ingestion or with a purpose-built transformation layer.
