# Validation Summary: How to Use ClickHouse with Looker

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (analytical database)
- Looker (BI platform)
- LookML (Looker modeling language)
- ClickHouse JDBC driver
- Persistent Derived Tables (PDTs)

## Sources Consulted
- ClickHouse JDBC driver documentation (com.clickhouse:clickhouse-jdbc) — SSL parameter reference (`sslmode` accepts `NONE` or `STRICT`, not PostgreSQL-style `verify-full`)
- ClickHouse SQL reference for `CREATE USER`, `GRANT`, `CREATE TABLE`, `ReplacingMergeTree`, `MergeTree`
- Looker documentation on ClickHouse dialect support, LookML `drill_fields` parameter, PDT configuration, and `sql_table_name` with `FINAL`
- Looker documentation on PDT scratch schema requirements (real tables, not temporary tables)
- LookML reference for `dimension_group`, `convert_tz`, `suggest_explore`, `suggest_dimension`, `persist_for`, `value_format_name`

## Issues Found

### 1. Incorrect JDBC SSL parameter value (line 74)
- **What was wrong:** The post used `sslmode=verify-full` in the JDBC connection parameters. `verify-full` is a PostgreSQL JDBC convention and is not recognized by the ClickHouse JDBC driver.
- **What was changed:** Replaced `sslmode=verify-full` with `sslmode=STRICT`, which is the correct ClickHouse JDBC driver value for full SSL certificate and hostname verification.
- **Why:** The ClickHouse JDBC driver only accepts `NONE` or `STRICT` for `sslmode`. Using `verify-full` would cause a connection configuration error.

### 2. Insufficient PDT permissions (lines 48-49)
- **What was wrong:** The post granted only `CREATE TEMPORARY TABLE ON *.*` for PDT support. Looker PDTs are real persistent tables materialized in a scratch database, not temporary tables. This grant is insufficient for PDTs to function.
- **What was changed:** Replaced the temporary table grant with: (a) creation of the `analytics_looker_scratch` database, and (b) proper grants for `CREATE TABLE`, `INSERT`, `SELECT`, `DROP TABLE`, and `ALTER` on the scratch database. These cover the full PDT lifecycle (create, populate, query, regenerate, drop).
- **Why:** Looker materializes PDTs as real tables in the designated scratch database. Without proper table lifecycle permissions, PDT creation and regeneration would fail.

### 3. Missing `total_amount` dimension in LookML orders view (line 163)
- **What was wrong:** The `count` measure's `drill_fields` referenced `total_amount`, but no dimension named `total_amount` was defined in the view. In LookML, all fields in `drill_fields` must be defined dimensions or measures. This would cause a LookML validation error.
- **What was changed:** Added a `total_amount` dimension of type `number` with `value_format_name: usd` to the orders view, placed logically before the `channel` dimension.
- **Why:** Without the dimension definition, the Looker IDE validator would flag this as an unknown field reference, blocking project deployment.

## Review Notes
- The `IDENTIFIED WITH plaintext_password BY` syntax is correct but stores the password in plaintext in ClickHouse server configuration. For production use, `sha256_password` would be more secure. This is a security best-practice note, not a technical error.
- The use of `FINAL` in `sql_table_name` for the `ReplacingMergeTree`-backed users view is correct and important for ensuring deduplicated results.
- The `convert_tz: no` recommendation for ClickHouse DateTime columns is correct — ClickHouse DateTime does not store timezone info, so Looker's timezone conversion can produce unexpected results.
- The PDT SQL using ClickHouse-specific functions (`toDate()`, `count()`, `now() - INTERVAL 90 DAY`) is correct and will generate valid ClickHouse SQL.
