# Validation Summary: How to Migrate from Oracle to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, JDBC bridge, DateTime64, LowCardinality, array functions)
- Oracle Database (SQL*Plus, Data Pump expdp, CLOB handling, DBMS_LOB, PL/SQL functions)
- Python (python-oracledb driver)
- Docker (JDBC bridge container)
- JDBC (Oracle JDBC driver, ClickHouse JDBC bridge)

## Sources Consulted
- Oracle python-oracledb documentation (replacement for deprecated cx_Oracle): https://python-oracledb.readthedocs.io/
- ClickHouse JDBC Bridge GitHub repository: https://github.com/ClickHouse/clickhouse-jdbc-bridge
- ClickHouse JDBC table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/jdbc
- ClickHouse WITH RECURSIVE CTE documentation: https://clickhouse.com/docs/sql-reference/statements/select/with
- Oracle SQL*Plus SET MARKUP CSV documentation (Oracle 12.2+)
- Oracle Data Pump (expdp) QUERY parameter documentation
- ClickHouse array functions documentation (arraySort, arrayMap, groupArray): https://clickhouse.com/docs/sql-reference/functions/array-functions

## Issues Found

1. **Deprecated Python package cx_Oracle**: The post used `cx_Oracle` which was deprecated in 2022 and replaced by `python-oracledb` (imported as `oracledb`). Changed all occurrences: `import cx_Oracle` to `import oracledb`, updated the connection call to use `oracledb.connect(user=..., password=..., dsn=...)` with separate parameters (modern best practice), and changed `pip install cx_Oracle` to `pip install oracledb`.

2. **SQL*Plus CLOB handling with TO_CHAR**: The SQL*Plus export used `TO_CHAR(PROPERTIES)` on a CLOB column, which silently truncates data exceeding 4000 bytes without any error. Changed to `DBMS_LOB.SUBSTR(PROPERTIES, 4000, 1)` to match the Python example and make the truncation explicit and predictable.

3. **LISTAGG rewrite had wrong sort order**: The ClickHouse equivalent of Oracle's `LISTAGG(event_type, ',') WITHIN GROUP (ORDER BY created_at)` was written as `arrayStringConcat(arraySort(groupArray(event_type)), ',')`, which sorts alphabetically by event_type string value rather than by created_at. Fixed to use a tuple-based approach: `arrayStringConcat(arrayMap(x -> x.2, arraySort(x -> x.1, groupArray(tuple(created_at, event_type)))), ',')` which correctly preserves the created_at ordering.

4. **Incorrect JDBC bridge Docker image name**: The post used `clickhouse/clickhouse-jdbc-bridge:latest` but the correct Docker Hub image is `clickhouse/jdbc-bridge:latest`. Fixed the image name.

5. **Incorrect JDBC bridge datasources.json credential fields**: The post used `"username"` and `"password"` as top-level keys, but the JDBC bridge expects `"dataSource.user"` and `"dataSource.password"`. Fixed both field names.

## Review Notes
- The Oracle Data Pump `QUERY` parameter omits the table name prefix (`QUERY="WHERE ..."`). This works for single-table exports but the canonical form is `QUERY=ANALYTICS.EVENTS:"WHERE ..."`. Left as-is since it is valid for this single-table use case.
- The `WITH RECURSIVE` CTE syntax for ClickHouse is correct and was introduced in ClickHouse 24.4, becoming enabled by default in 24.8. For very deep hierarchies, pre-flattened arrays may perform better in ClickHouse's columnar engine.
- The JDBC bridge is a community/experimental feature. For production migrations, the CSV export + clickhouse-client import approach (Steps 1-3) is more reliable.
- The data type mapping table is comprehensive and accurate. The note about Oracle DATE including time (unlike SQL standard DATE) is an important callout.
- The `DBMS_LOB.SUBSTR` calls in both the SQL*Plus and Python examples truncate CLOBs at 4000 characters. For CLOBs exceeding this size, a programmatic approach with chunked reads would be needed.
