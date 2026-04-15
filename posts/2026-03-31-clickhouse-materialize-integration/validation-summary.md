# Validation Summary: How to Use Materialize with ClickHouse

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Materialize (streaming SQL database)
- ClickHouse (OLAP database)
- Apache Kafka (message broker, used as intermediary)
- ClickHouse Kafka table engine
- ClickHouse ReplacingMergeTree engine
- psql / clickhouse-client CLI tools

## Sources Consulted
- Materialize CREATE SOURCE (Kafka) documentation: https://materialize.com/docs/sql/create-source/kafka/
- Materialize CREATE SINK (Kafka) documentation: https://materialize.com/docs/sql/create-sink/kafka/
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka

## Issues Found

### 1. Materialize FORMAT JSON source does not produce individual columns
- **What was wrong:** The `CREATE MATERIALIZED VIEW hourly_event_counts` referenced columns `event_time`, `event_type`, and `user_id` directly from `events_source`, but `FORMAT JSON` in Materialize produces a single `data` column of type `jsonb`, not individual typed columns.
- **What was changed:** Added an intermediate parsing `CREATE VIEW events` that extracts and casts fields from the `data` jsonb column (`data->>'event_time'`, `data->>'event_type'`, `data->>'user_id'`). Updated the materialized view to select from this parsed view instead of the raw source.
- **Why:** Per Materialize documentation, FORMAT JSON creates "a single column named `data` with type `jsonb`". A parsing view is the standard pattern for extracting typed columns from JSON sources.

### 2. Materialize sink ENVELOPE UPSERT missing required KEY clause
- **What was wrong:** The `CREATE SINK` used `ENVELOPE UPSERT` without a `KEY` clause.
- **What was changed:** Added `KEY (hour, event_type)` to the sink definition.
- **Why:** Per Materialize documentation, the UPSERT envelope "requires that you specify a unique key for the sink's upstream relation using the KEY option." Without it, the sink creation would fail.

## Review Notes
- The ClickHouse Kafka engine table, ReplacingMergeTree destination table, and materialized view pipeline are all syntactically correct and follow standard patterns.
- The ClickHouse query using `toStartOfWeek()`, `INTERVAL 90 DAY`, and `LowCardinality(String)` is valid ClickHouse SQL.
- The batch export command using `psql` (Materialize supports the PostgreSQL wire protocol) piping CSV to `clickhouse-client` is a valid and practical approach.
- The overall architecture pattern (Materialize for real-time views, Kafka as transport, ClickHouse for historical storage with ReplacingMergeTree to handle upserts) is sound and well-explained.
- Materialize syntax evolves rapidly; readers should consult current docs for their specific version.
