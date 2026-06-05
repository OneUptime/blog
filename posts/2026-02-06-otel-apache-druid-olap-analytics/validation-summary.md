# Validation Summary: How to Configure OpenTelemetry with Apache Druid for Real-Time OLAP Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol JSON encoding
- OpenTelemetry Collector Kafka exporter
- OpenTelemetry Collector transform processor
- Apache Kafka
- Apache Druid Kafka ingestion
- Apache Druid ingestion specs, flattenSpec, transformSpec, rollup, and SQL

## Sources Consulted
- OpenTelemetry Collector Kafka exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry batch processor API documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Apache Druid Kafka ingestion documentation: https://druid.apache.org/docs/latest/ingestion/kafka-ingestion/
- Apache Druid supervisor documentation: https://druid.apache.org/docs/latest/ingestion/supervisor/
- Apache Druid ingestion spec reference: https://druid.apache.org/docs/latest/ingestion/ingestion-spec/
- Apache Druid input format and flattenSpec documentation: https://druid.apache.org/docs/latest/ingestion/data-formats/
- Apache Druid expression documentation: https://druid.apache.org/docs/latest/querying/math-expr/
- Apache Druid SQL scalar function documentation: https://druid.apache.org/docs/latest/querying/sql-scalar/

## Issues Found
- The Collector batch configuration sent batches of up to thousands of telemetry items, while the Druid JSONPath examples only extracted the first span or point from each OTLP JSON Kafka message. Changed the batch processor settings to `send_batch_size: 1` and `send_batch_max_size: 1` so the direct Druid flattening examples match the Kafka payload shape.
- The trace ingestion spec referenced `status_code` and `duration_ns`, but neither field was extracted or generated. Added a `status_code` JSONPath field and a Druid `transformSpec` that computes `duration_ns` from `start_time` and `end_time` using `parse_long`.
- The metrics ingestion spec expected root-level `timestamp`, `metric_name`, `service_name`, `instance_id`, and `value` fields even though the Kafka exporter emits nested OTLP JSON. Added a `flattenSpec` for gauge metric datapoints and changed the timestamp format from `millis` to `nano` to match OTLP `timeUnixNano`.
- The Collector transform processor example did not specify `error_mode`. Added `error_mode: ignore`, matching the transform processor's recommended mode for continuing when individual OTTL statements encounter missing fields or other statement-level errors.
- The metric ingestion section implied all OTLP metric point types would work with the same paths. Added a short caveat that the shown spec handles gauge metrics and that sums and histograms need their corresponding OTLP JSON paths.

## Review Notes
The direct Druid specs are suitable as tutorial examples for one telemetry item per Kafka message. For high-throughput production pipelines, a stream processor or custom exporter that normalizes OTLP batches into one Druid row per span or metric point would usually be preferable to forcing one-item Collector batches.
