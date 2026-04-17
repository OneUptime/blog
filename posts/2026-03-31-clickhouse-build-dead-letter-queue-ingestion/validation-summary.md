# Validation Summary: How to Build a Dead Letter Queue for ClickHouse Ingestion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, Kafka table engine, TTL, mutations, table functions)
- ClickHouse SQL (CREATE TABLE, INSERT, ALTER ... UPDATE, JSONExtractString, input())
- Kafka (as a source for ClickHouse ingestion)
- Bash / clickhouse-client CLI

## Sources Consulted
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse `input()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/input
- ClickHouse formats (JSONEachRow, LineAsString): https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse ALTER UPDATE (mutations): https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse TTL expressions: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse JSON functions (JSONExtractString): https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- clickhouse-client reference: https://clickhouse.com/docs/en/interfaces/cli

## Issues Found
No technical issues found. All code samples use valid, current ClickHouse syntax:
- MergeTree DDL with `ORDER BY`, `TTL ... + INTERVAL 30 DAY`, and column `DEFAULT` expressions is correct.
- Kafka engine settings (`kafka_broker_list`, `kafka_topic_list`, `kafka_group_name`, `kafka_format`, `kafka_skip_broken_messages`) are the correct setting names.
- `LineAsString` and `JSONEachRow` are valid ClickHouse input formats.
- `input('col Type, ...')` table function usage with `FORMAT JSONEachRow` matches the documented pattern.
- `ALTER TABLE ... UPDATE ... WHERE` mutation syntax is correct.
- `JSONExtractString(column, 'field')` signature is correct.

## Review Notes
- The bash example inlines `$(cat batch.json)` and `$ERROR_MSG` directly into a SQL string, which will break on quotes/newlines and is a SQL-injection risk in practice. This is a style/robustness caveat for readers rather than a technical inaccuracy — a production implementation should use parameterized queries or a proper client library (e.g., `--param_` bindings, or inserting the raw payload via `FORMAT Values`/`FORMAT JSONEachRow` over stdin).
- `kafka_skip_broken_messages = 1000` permits up to 1000 broken messages per block to be skipped silently; readers should understand this tolerance interacts with the DLQ strategy (skipped messages are NOT automatically routed to the DLQ topic — a separate producer is needed to write to `events-dlq`).
- The `ALTER TABLE ... UPDATE` mutation is asynchronous in ClickHouse; replayed-record marking will not be instantaneous, which can affect idempotency if the replay is re-run quickly.
- For the `input()` pattern, enabling/controlling error tolerance can also be done via `input_format_allow_errors_num` / `input_format_allow_errors_ratio` settings — worth mentioning as a complementary knob, though its absence is not an error.
