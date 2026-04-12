# Validation Summary: How to Use TiDB as a MySQL-Compatible Distributed Database

## Status
validated

## Post Type
Tutorial / Quick-start guide

## Technologies Covered
- TiDB (distributed SQL database)
- TiKV (distributed key-value store)
- TiFlash (columnar storage engine)
- PD (Placement Driver)
- TiUP (cluster management tool)
- TiDB Data Migration (DM)
- MySQL 5.7 protocol
- Prometheus / Grafana (monitoring)

## Sources Consulted
- TiDB official documentation: https://docs.pingcap.com/tidb/stable
- TiUP documentation: https://docs.pingcap.com/tidb/stable/tiup-overview
- TiDB playground reference: https://docs.pingcap.com/tidb/stable/tiup-playground
- TiDB MySQL compatibility reference: https://docs.pingcap.com/tidb/stable/mysql-compatibility
- TiDB TiFlash documentation: https://docs.pingcap.com/tidb/stable/tiflash-overview
- TiDB Data Migration documentation: https://docs.pingcap.com/tidb/stable/dm-overview
- TiDB topology configuration reference: https://docs.pingcap.com/tidb/stable/tiup-cluster-topology-reference
- MySQL 5.7 Reference Manual, Section 11.2.5 (Automatic Initialization for TIMESTAMP and DATETIME)

## Issues Found
1. **Invalid GROUP BY query in HTAP section**: The query `SELECT price, COUNT(*), AVG(price) FROM products GROUP BY FLOOR(price/10)*10` had `price` in the SELECT list without it being in the GROUP BY clause or wrapped in an aggregate function. TiDB enables `ONLY_FULL_GROUP_BY` by default (matching MySQL 5.7 strict mode), so this query would fail with an error. Fixed by changing `price` to `FLOOR(price/10)*10 AS price_range` to match the GROUP BY expression.

## Review Notes
- The post states TiDB is compatible with "the MySQL 5.7 protocol." This remains accurate as TiDB's core protocol compatibility layer is MySQL 5.7, though newer TiDB versions (6.x, 7.x) have added support for some MySQL 8.0 features. This is not an error but worth noting for future updates.
- The TiUP playground command, connection instructions, SQL examples, topology YAML, DM migration commands, and monitoring guidance are all correct for TiDB v7.5.x.
- The `DATETIME DEFAULT NOW()` usage is valid — MySQL 5.7 and TiDB both accept `NOW()` as a synonym for `CURRENT_TIMESTAMP` in DEFAULT clauses for temporal columns.
- The `SHOW TABLE products REGIONS` command is a TiDB-specific SQL extension and is correctly documented.
- The `information_schema.tiflash_replica` table and the column names `TABLE_SCHEMA`/`TABLE_NAME` used in the WHERE clause are correct.
