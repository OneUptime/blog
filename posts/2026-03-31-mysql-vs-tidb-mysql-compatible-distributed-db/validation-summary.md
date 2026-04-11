# Validation Summary: MySQL vs TiDB: MySQL-Compatible Distributed Database Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MySQL
- TiDB
- TiKV (distributed key-value storage)
- TiFlash (columnar analytics engine)
- PD (Placement Driver)
- Vitess (mentioned as MySQL sharding alternative)
- CockroachDB (mentioned for contrast)

## Sources Consulted
- TiDB official documentation: SQL Statements — SHOW TABLE REGIONS syntax (https://docs.pingcap.com/tidb/stable/sql-statement-show-table-regions)
- TiDB official documentation: AUTO_RANDOM attribute (https://docs.pingcap.com/tidb/stable/auto-random)
- TiDB official documentation: TiDB Architecture (https://docs.pingcap.com/tidb/stable/tidb-architecture)
- TiDB official documentation: TiFlash Overview (https://docs.pingcap.com/tidb/stable/tiflash-overview)
- TiDB official documentation: Optimizer Hints — READ_FROM_STORAGE (https://docs.pingcap.com/tidb/stable/optimizer-hints)
- TiDB official documentation: MySQL Compatibility (https://docs.pingcap.com/tidb/stable/mysql-compatibility)
- Google Percolator paper for transaction model reference

## Issues Found
1. **Incorrect `SHOW TABLE REGIONS` syntax**: The post used `SHOW TABLE REGIONS LIKE 'orders';` which is not valid TiDB SQL. The correct syntax is `SHOW TABLE orders REGIONS;` — the table name comes before the `REGIONS` keyword and the `LIKE` clause is not part of this statement. Fixed in the post.

## Review Notes
- The version string `5.7.25-TiDB-v7.x.x` is accurate for TiDB v7.x releases. Note that TiDB v8.x changed the reported MySQL compatibility version to `8.0.11-TiDB-v8.x.x`. The post uses `v7.x.x` as a placeholder which is fine for illustrative purposes.
- The default region size of 96 MB is correct (controlled by the `region-split-size` config in TiKV).
- The claim that TiDB's distributed transaction model is based on the Percolator protocol is accurate — TiDB implements an optimistic and pessimistic transaction model inspired by Google's Percolator.
- All other code examples, SQL syntax, architecture descriptions, and comparison table entries are technically accurate.
