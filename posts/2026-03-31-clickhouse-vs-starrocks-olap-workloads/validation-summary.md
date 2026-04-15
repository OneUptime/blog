# Validation Summary: ClickHouse vs StarRocks for OLAP Workloads

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, Kafka table engine, SQL dialect)
- StarRocks (CBO optimizer, Primary Key table model, stream load)
- Apache Kafka (as ingestion source)
- Apache Doris (mentioned as StarRocks origin)

## Sources Consulted
- ClickHouse official documentation — SQL functions: toStartOfHour, countIf, avg (https://clickhouse.com/docs/en/sql-reference/functions)
- ClickHouse official documentation — Kafka table engine and settings (https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka)
- ClickHouse official documentation — MergeTree engine family (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family)
- StarRocks official documentation — Primary Key model and CBO (https://docs.starrocks.io/docs/table_design/table_types/primary_key_table/)
- StarRocks official documentation — Loading data via Stream Load and Flink connector (https://docs.starrocks.io/docs/loading/Loading_intro/)

## Issues Found
No technical issues found.

## Review Notes
- The claim that ClickHouse "does not support natively" updating existing rows is a simplification. ClickHouse offers `ALTER TABLE UPDATE/DELETE` mutations and `ReplacingMergeTree` for eventual-consistency deduplication. However, these mechanisms are heavyweight compared to StarRocks's Primary Key upsert model, so the comparison is fair in context.
- The post is balanced and accurate as a high-level comparison. Code examples are syntactically correct and use current, non-deprecated APIs.
