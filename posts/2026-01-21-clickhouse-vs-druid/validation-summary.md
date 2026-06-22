# Validation Summary: ClickHouse vs Apache Druid: Real-Time Analytics Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- ClickHouse
- Apache Druid
- Kafka ingestion
- OLAP query processing
- SQL aggregation and distinct counting
- Materialized views, roll-up, and pre-aggregation
- Docker Compose deployment examples

## Sources Consulted
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse AggregateFunction type documentation: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse file table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/file
- ClickHouse s3 table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse uniqExact documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse uniq documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- ClickHouse delete mutations documentation: https://clickhouse.com/docs/managing-data/delete_mutations
- Apache Druid Kafka ingestion documentation: https://druid.apache.org/docs/latest/ingestion/kafka-ingestion/
- Apache Druid native batch ingestion documentation: https://druid.apache.org/docs/latest/ingestion/native-batch/
- Apache Druid ingestion spec reference: https://druid.apache.org/docs/latest/ingestion/ingestion-spec/
- Apache Druid SQL aggregation documentation: https://druid.apache.org/docs/latest/querying/sql-aggregations/
- Apache Druid SQL query translation documentation: https://druid.apache.org/docs/latest/querying/sql-translation/
- Apache Druid query execution documentation: https://druid.apache.org/docs/latest/querying/query-execution/
- Apache Druid joins documentation: https://druid.apache.org/docs/latest/querying/joins/
- Apache Druid SQL functions documentation: https://druid.apache.org/docs/latest/querying/sql-functions/

## Issues Found
- The post stated that Druid exact `COUNT DISTINCT` was approximate-only. Updated the feature table, example comments, and benchmark table to reflect that Druid uses approximate distinct counts by default but supports exact `COUNT(DISTINCT ...)` when `useApproximateCountDistinct=false`, with documented limitations.
- The ClickHouse complex-query example used `percentile(0.95)`, which is not the documented ClickHouse aggregate-function form. Changed it to `quantile(0.95)`.
- The Druid Kafka ingestion example omitted the required `spec` wrapper and `inputFormat` in `ioConfig`. Updated the example to match the documented Kafka supervisor spec shape.
- Several Druid snippets were fenced as JSON but contained JavaScript-style comments. Removed those comments so the snippets are valid JSON.
- The ClickHouse Kafka example used `ENGINE = Kafka`; updated it to the documented `ENGINE = Kafka()` form.
- The ClickHouse file table function example used an unquoted `Parquet` format argument. Updated it to `'Parquet'`.
- The Druid roll-up example used `longSum` for a revenue field represented elsewhere as floating-point data. Changed it to `doubleSum`.
- The ClickHouse roll-up example stored `AggregateFunction` state in a `SummingMergeTree`. Updated it to `AggregatingMergeTree`, which is the documented engine for aggregate states in materialized roll-ups.
- The Druid update/delete comparison said "Not supported" broadly. Narrowed it to "No row-level DML" to match Druid SQL limitations while avoiding an overbroad statement about segment replacement/drop operations.
- The Druid subquery comparison said "Limited support" without context. Updated it to note broker memory limits, matching Druid's documented subquery execution behavior.

## Review Notes
The benchmark figures remain workload-dependent illustrative ranges rather than reproducible benchmark results. A future update could add hardware, schema, data distribution, and query-context details if the post is intended to make benchmark claims.
