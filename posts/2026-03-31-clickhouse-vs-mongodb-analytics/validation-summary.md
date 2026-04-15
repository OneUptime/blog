# Validation Summary: ClickHouse vs MongoDB for Analytics

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- ClickHouse (column-oriented OLAP database)
- MongoDB (document-oriented OLTP database)
- Debezium (CDC connector)
- Apache Kafka (message streaming)

## Sources Consulted
- ClickHouse SQL reference and data types documentation: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse MongoDB table engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/mongodb
- MongoDB aggregation pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB $lookup documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- Debezium MongoDB connector documentation: https://debezium.io/documentation/reference/stable/connectors/mongodb.html

## Issues Found
No technical issues found.

## Review Notes
- The characterization of ClickHouse as "eventual consistency" is a simplification. Single-node ClickHouse provides immediate consistency; eventual consistency applies to replicated setups across replicas. This is acceptable for a high-level comparison table but could be clarified in a future revision.
- The 10-100x performance difference claim for analytical queries is a reasonable ballpark based on published benchmarks, though actual results vary by query pattern, data shape, and indexing strategy.
- MongoDB has been adding analytics-oriented features over time (e.g., columnar indexes in Atlas, improved aggregation pipeline), but the fundamental architectural differences described in this post remain valid.
