# Validation Summary: How to Handle Cross-Shard Queries in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (sharding architecture)
- Python (mysql-connector-python library)
- Debezium CDC
- ETL pipelines

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE syntax — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- mysql-connector-python API documentation — https://dev.mysql.com/doc/connector-python/en/
- Debezium documentation — https://debezium.io/documentation/
- Vitess sharding documentation (industry reference for MySQL sharding patterns) — https://vitess.io/docs/

## Issues Found
- **Description metadata listed "secondary indexes" but the post does not cover that pattern.** The post covers routing tables, denormalization, scatter-gather, and aggregation replicas. Changed "secondary indexes" to "aggregation replicas" in the description to match the actual content.

## Review Notes
- Pattern 2 is titled "Denormalization with Broadcast Writes" but the code shows a dual-write to one shard plus one central table, not a true broadcast to all shards. The code is correct and functional, but "broadcast write" is a slightly loose use of the term. Not changed since the surrounding text accurately describes what the code does.
- The scatter-gather pagination example (Pattern 3) correctly fetches `limit` rows from each shard and re-sorts in the application. This is the standard approach but worth noting it fetches up to `limit * num_shards` rows into memory, which the post does not warn about. Not a technical error, but a scalability caveat readers should be aware of.
- All Python code uses parameterized queries (`%s` placeholders), which is the correct and safe approach for mysql-connector-python, avoiding SQL injection.
