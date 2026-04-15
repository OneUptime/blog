# Validation Summary: ClickHouse vs Druid for Real-Time Analytics

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- ClickHouse (MergeTree engine, Kafka engine, SQL syntax)
- Apache Druid (architecture, rollup, streaming ingestion, segment model)
- Apache Kafka (as ingestion source for both systems)
- ZooKeeper / ClickHouse Keeper

## Sources Consulted
- ClickHouse Kafka Engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- Apache Druid Architecture: https://druid.apache.org/docs/latest/design/architecture/
- Apache Druid Metadata Storage: https://druid.apache.org/docs/latest/design/metadata-storage/
- Apache Druid ZooKeeper: https://druid.apache.org/docs/latest/design/zookeeper/
- Apache Druid Rollup: https://druid.apache.org/docs/latest/ingestion/rollup
- Apache Druid Ingestion Spec: https://druid.apache.org/docs/latest/ingestion/ingestion-spec
- Apache Druid Segments: https://druid.apache.org/docs/latest/design/segments
- Apache Druid Streaming Ingestion: https://druid.apache.org/docs/latest/ingestion/streaming
- Apache Druid Clustered Deployment: https://druid.apache.org/docs/latest/tutorials/cluster/

## Issues Found
1. **"native coordinator" terminology**: The post stated Druid coordination uses "ZooKeeper or the native coordinator." There is no official Druid feature called "native coordinator." Recent Druid versions (31.0.0+) have reduced ZooKeeper dependency by replacing ZooKeeper-based segment loading with HTTP-based coordination, but this is not branded as a "native coordinator." Fixed to: "ZooKeeper (though recent versions have reduced ZooKeeper dependency with HTTP-based coordination)."
2. **"typically PostgreSQL" for metadata store**: Minor overclaim — Druid officially supports MySQL and PostgreSQL equally as production metadata stores. Fixed to mention both MySQL and PostgreSQL.

## Review Notes
- The ClickHouse Kafka engine CREATE TABLE syntax is correct, including all four required SETTINGS (kafka_broker_list, kafka_topic_list, kafka_group_name, kafka_format).
- The materialized view pattern for consuming from Kafka engine tables is correct.
- The ClickHouse SQL syntax (toStartOfMinute, count(), INTERVAL) is valid.
- The Druid ingestion spec snippet is valid — rollup, queryGranularity, count metric, and doubleSum metric all match official documentation.
- The Druid architecture description omits the Router and Peon services, but this is acceptable for a comparison blog post that focuses on the main services.
- The claim that Druid rollup defaults to true is consistent with Druid documentation.
- All high-level architectural comparisons (operational complexity, schema evolution, ingestion models) are accurate.
