# Validation Summary: ClickHouse vs Apache Pinot for Real-Time Analytics

## Status
validated

## Post Type
Comparison / Reference guide

## Technologies Covered
- ClickHouse (MergeTree engine, Kafka table engine, materialized views)
- Apache Pinot (REALTIME/OFFLINE tables, stream ingestion, indexes)
- Apache Kafka (stream ingestion source)
- Apache ZooKeeper / Apache Helix (Pinot coordination)
- SQL dialects (ClickHouse SQL, Pinot SQL, legacy PQL)
- Docker / docker-compose (deployment)

## Sources Consulted
- ClickHouse Kafka table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse aggregate functions (topK, uniqHLL12): https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/topk
- ClickHouse date/time functions (toStartOfHour): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- Apache Pinot release notes (PQL deprecation in 0.7.1, removal in later releases): https://docs.pinot.apache.org/basics/releases/0.7.1
- Apache Pinot DATETIMECONVERT: https://docs.pinot.apache.org/configuration-reference/functions/datetimeconvert
- Apache Pinot ago() function: https://docs.pinot.apache.org/configuration-reference/functions/ago
- Apache Pinot forward index / compression defaults: https://docs.pinot.apache.org/basics/indexing/forward-index
- Apache Pinot table config reference: https://docs.pinot.apache.org/configuration-reference/table
- Apache Pinot stream ingestion: https://docs.pinot.apache.org/basics/data-import/pinot-stream-ingestion

## Issues Found
1. **ClickHouse Kafka `CREATE TABLE` was missing a column definition block.** The Kafka engine requires columns to be declared before `ENGINE = Kafka`; the original snippet would fail at parse time. Added a minimal `(ts DateTime, user_id UInt64, event_type String)` schema so the example is actually runnable.
2. **Outdated claim about PQL.** The post said "Pinot uses PQL and standard SQL with some extensions." PQL was deprecated in Pinot 0.7.1 and has since been removed — current Pinot uses standard SQL only (with Pinot-specific extensions). Updated the wording to reflect PQL's removal.
3. **Inaccurate default compression for Pinot.** The comparison table listed "Snappy/Zstd" as Pinot's default. Since Pinot 0.10.0 the default raw forward index compression is LZ4 (Snappy and Zstd remain supported alternatives). Updated the cell to "LZ4 (Snappy and Zstd also supported)".

## Review Notes
- The Pinot table config snippet uses the flat `streamConfigs` map. Newer Pinot versions prefer placing stream configs under `ingestionConfig.streamIngestionConfig.streamConfigMaps`, but the flat form in the post remains widely documented and supported for backwards compatibility, so no change was needed.
- Latency and concurrency claims (Pinot sub-second, ClickHouse 1–5s Kafka batch, Pinot P99 <100ms) are consistent with published benchmarks and typical deployments; they are presented as typical guidance rather than guarantees, which is appropriate.
- Index lists for both systems are illustrative subsets. ClickHouse also supports `set`, `ngrambf_v1`, and `tokenbf_v1` data skipping indexes; Pinot also supports Star-Tree, text, JSON, H3/geospatial, and timestamp indexes. The post's shorter lists are acceptable for a comparison summary.
