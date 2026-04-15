# Validation Summary: How to Migrate from MySQL to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, MySQL table function, MySQL database engine, MaterializedMySQL engine)
- MySQL (export methods, binary log replication, GTID)
- SQL (DDL, DML, data type mapping)
- CLI tools (clickhouse-client, mysql client, mysqldump)

## Sources Consulted
- ClickHouse MaterializedMySQL documentation — https://clickhouse.com/docs/engines/database-engines/materialized-mysql
- ClickHouse MySQL database engine documentation — https://clickhouse.com/docs/engines/database-engines/mysql
- ClickHouse `uniq()` aggregate function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- ClickHouse `uniqExact()` aggregate function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse MergeTree data skipping indexes documentation — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse `mysql()` table function documentation — https://clickhouse.com/docs/sql-reference/table-functions/mysql
- MySQL `SELECT INTO OUTFILE` documentation — https://dev.mysql.com/doc/refman/8.0/en/select-into.html

## Issues Found

1. **Materialized view on MySQL engine table incorrectly described as auto-triggering (Step 4):** The post claimed a materialized view on a MySQL database engine table would "automatically copy new rows from MySQL into ClickHouse." This is incorrect — the MySQL database engine creates a proxy/virtual mapping, not a local table. Materialized views only trigger on INSERT operations flowing through ClickHouse, and proxy tables don't produce such events. Fixed by replacing the MV example with a periodic batch INSERT...SELECT and adding a clarifying note.

2. **Missing GTID configuration for MaterializedMySQL (Step 4):** The MySQL configuration for MaterializedMySQL was missing the required `gtid_mode = ON` and `enforce_gtid_consistency = ON` settings. MaterializedMySQL requires GTID-based replication. Added both settings to the MySQL config block and updated the text to mention GTID.

3. **`uniq()` used instead of `uniqExact()` for migration validation (Step 5):** The validation section used `uniq(user_id)` to compare against MySQL's `COUNT(DISTINCT user_id)`. ClickHouse's `uniq()` is an approximate function (using adaptive sampling), which defeats the purpose of exact migration validation. Changed to `uniqExact(user_id)` for accurate comparison.

4. **"No secondary indexes" claim was inaccurate (Key differences):** The post stated "No secondary indexes" as a key difference. ClickHouse does support data skipping indexes (MinMax, Set, Bloom Filter, etc.). Clarified to "No B-tree secondary indexes" and mentioned data skipping indexes as an option.

## Review Notes
- The `MaterializedMySQL` engine is still flagged as experimental in ClickHouse and requires setting `allow_experimental_database_materialized_mysql = 1`. The post does not mention this, but adding it was deemed too version-specific for a general migration guide.
- The data type mapping table is comprehensive and accurate. One minor omission: SMALLINT UNSIGNED → UInt16 is not listed, but this is not an error.
- The `SELECT INTO OUTFILE` remote export example (Step 1, second code block) writes to the MySQL server filesystem, not the client machine. The third example using `--batch --skip-column-names` is the correct approach for client-side export. The text is not strictly wrong but could be clearer about this distinction.
- ClickHouse's `SETTINGS index_granularity = 8192` is the default value, so specifying it is redundant but not incorrect — it serves as documentation.
