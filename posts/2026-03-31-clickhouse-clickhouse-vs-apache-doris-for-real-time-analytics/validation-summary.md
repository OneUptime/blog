# Validation Summary: ClickHouse vs Apache Doris for Real-Time Analytics

## Status
validated

## Post Type
Comparison / Technology evaluation guide

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree, ClickHouse Keeper, Kafka Engine)
- Apache Doris (FE/BE architecture, Unique Key Model, Stream Load, Routine Load, Broker Load, Bdbje)
- SQL (ClickHouse dialect and MySQL-compatible Doris dialect)

## Sources Consulted
- ClickHouse documentation: https://clickhouse.com/docs
- ClickHouse ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse aggregate functions (uniq, quantile): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- Apache Doris documentation: https://doris.apache.org/docs/
- Apache Doris data model (Unique Key): https://doris.apache.org/docs/data-table/data-model
- Apache Doris data ingestion (Stream/Routine/Broker Load): https://doris.apache.org/docs/data-operate/import/
- Apache Doris Wiki / origin: https://github.com/apache/doris/wiki/Doris-Overview
- DorisProposal (Apache Incubator): https://wiki.apache.org/incubator/DorisProposal

## Issues Found
- **Apache Doris lineage was incorrect.** The post originally stated Doris is "based on the Apache Impala/Druid lineage." Doris was actually developed at Baidu as Palo and is based on the integration of **Google Mesa** (storage layer inspiration) and **Apache Impala** (MPP query engine). Apache Druid is an unrelated project. Updated the architecture section to read "Google Mesa and Apache Impala lineage (originally developed at Baidu as Palo)."

## Review Notes
- All SQL code samples are syntactically correct for both engines:
  - ClickHouse: `toStartOfHour`, `uniq`, `quantile(0.95)(...)`, `INTERVAL 24 HOUR`, `ReplacingMergeTree(version)` with `FINAL` for deduplicated reads.
  - Doris: `DATE_FORMAT`, `APPROX_COUNT_DISTINCT`, `PERCENTILE_APPROX`, and the Unique Key Model `CREATE TABLE` (with `DISTRIBUTED BY HASH ... BUCKETS`) all match the official Doris reference.
- The "Replication: Built-in Bdbje" entry in the operational complexity table is a simplification — Bdbje (Berkeley DB Java Edition) is used for FE metadata replication, while BE data tablets are replicated separately and coordinated by the FE. The shorthand is acceptable for a quick comparison table but is not the full picture.
- Performance characterizations (e.g., "ClickHouse is extremely fast at simple aggregations" vs. "Doris is fast") are subjective directional claims rather than benchmark numbers; readers should benchmark with their own workloads.
- The claim about Stream Load having "lower per-row overhead at high rates" vs. ClickHouse's Kafka Engine is workload-dependent and hard to generalize, but it matches common community guidance.
