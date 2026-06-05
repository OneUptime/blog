# Validation Summary: How to Use GlassFlow as a Stream Processor Between OpenTelemetry Kafka Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Kafka exporter
- Apache Kafka
- GlassFlow
- GlassFlow Python SDK
- ClickHouse

## Sources Consulted
- GlassFlow Introduction: https://docs.glassflow.dev/
- GlassFlow Python SDK: https://docs.glassflow.dev/usage-guide/python-sdk
- GlassFlow Pipeline Configuration Reference: https://docs.glassflow.dev/configuration/pipeline-config-reference
- GlassFlow Supported Data Formats: https://docs.glassflow.dev/configuration/data-format
- GlassFlow Stateless Transformations: https://docs.glassflow.dev/transformations/stateless-transformation
- GlassFlow Data Flow: https://docs.glassflow.dev/architecture/data-flow
- OpenTelemetry Collector Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree

## Issues Found
- The post described GlassFlow as a serverless Python-function stream processor and used a non-current `glassflow.GlassFlowClient()` / `create_pipeline(source=..., sink=...)` API. Updated the post to describe current GlassFlow as an open-source streaming ETL platform and replaced the code with the documented `glassflow.etl.Client` v3 pipeline configuration style.
- The GlassFlow sink example used a webhook pointed at the ClickHouse HTTP interface. Current GlassFlow pipeline configuration uses a native `clickhouse` sink with `connection_params`, `table`, batching settings, and `mapping`. Replaced the webhook sink with a ClickHouse sink.
- The transformation example used a Python `handler(data, log)` that flattened raw OTLP JSON batches. Current GlassFlow transformations are expression-based pipeline transforms, and stateless transformations emit a new JSON object made from configured output fields. Replaced the handler with supported `filter` and `dedup` transforms and made the Kafka input contract explicit: messages must already be flattened JSON span records, or users should flatten upstream/use GlassFlow's OTLP source.
- The OpenTelemetry Kafka exporter snippet used top-level `topic` and `encoding`. Current Kafka exporter docs list per-signal settings such as `traces.topic` and `traces.encoding`. Updated the snippet accordingly.
- The ClickHouse `ReplacingMergeTree` explanation implied automatic immediate deduplication. ClickHouse documentation states deduplication happens only during background merges and does not guarantee duplicates are absent without query-time `FINAL`. Updated the explanation to call this eventual deduplication and recommend GlassFlow deduplication or `FINAL` when needed.
- The monitoring example referenced handler logging, which no longer applies to the corrected GlassFlow pipeline model. Replaced it with SDK health/status inspection.

## Review Notes
The corrected tutorial assumes a flattened span-per-message Kafka topic, because raw OpenTelemetry `otlp_json` trace exports contain nested `resourceSpans` batches and are not equivalent to the flat ClickHouse row schema shown in the post. A future revision could add a separate, fully documented upstream flattening step or switch the tutorial to GlassFlow's direct OTLP source.
