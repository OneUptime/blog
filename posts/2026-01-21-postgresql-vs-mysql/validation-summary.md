# Validation Summary: PostgreSQL vs MySQL: Which Database to Choose

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- MySQL
- SQL
- JSON/JSONB
- Window functions
- Common table expressions
- MVCC
- Replication
- PostgreSQL extensions
- MySQL plugins
- Amazon Aurora
- Managed database services

## Sources Consulted
- PostgreSQL documentation: JSON types and JSONB indexing: https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL documentation: geometric types: https://www.postgresql.org/docs/current/datatype-geometric.html
- PostgreSQL documentation: window functions: https://www.postgresql.org/docs/current/functions-window.html
- PostgreSQL documentation: aggregate functions: https://www.postgresql.org/docs/current/functions-aggregate.html
- PostgreSQL documentation: logical replication publications: https://www.postgresql.org/docs/current/logical-replication-publication.html
- PostgreSQL documentation: CREATE SUBSCRIPTION: https://www.postgresql.org/docs/current/sql-createsubscription.html
- PostGIS documentation: PostGIS geometry/geography data types: https://postgis.net/docs/using_postgis_dbmanagement.html
- MySQL documentation: JSON data type and indexing generated columns: https://dev.mysql.com/doc/refman/8.4/en/json.html
- MySQL documentation: generated-column indexes: https://dev.mysql.com/doc/refman/8.4/en/create-table-secondary-indexes.html
- MySQL documentation: spatial data types and SRID attributes: https://dev.mysql.com/doc/refman/8.4/en/spatial-type-overview.html
- MySQL documentation: window functions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL documentation: GTID enablement and SOURCE_AUTO_POSITION: https://dev.mysql.com/doc/refman/8.4/en/replication-mode-change-online-enable-gtids.html
- MySQL documentation: Group Replication multi-primary mode: https://dev.mysql.com/doc/refman/8.4/en/group-replication-multi-primary-mode.html
- AWS documentation: Aurora PostgreSQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html
- AWS documentation: Aurora MySQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.release-calendars.html
- AWS documentation: Aurora storage limits: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_Limits.html

## Issues Found
- The PostgreSQL data type example used `GEOMETRY(Point, 4326)` under "Rich native types", but that type signature is provided by PostGIS, not core PostgreSQL. Changed it to PostgreSQL's native `POINT` type.
- The MySQL data type example said spatial data requires a spatial extension. MySQL has built-in spatial types and supports SRID attributes on spatial columns, so the comment now says "Built-in spatial type."
- The MySQL JSON query compared `JSON_EXTRACT(...)` directly to the SQL string `'red'`. Since `JSON_EXTRACT` returns a JSON value, changed the predicate to use the unquoting `->>` operator.
- The PostgreSQL window function example used `PERCENTILE_CONT(...) WITHIN GROUP (...) OVER (...)`, but PostgreSQL only allows ordinary aggregates, not ordered-set aggregates such as `percentile_cont`, to be used as window functions. Replaced it with `AVG(salary) OVER (...)`.
- The MySQL replication example showed `SET GLOBAL gtid_mode = ON` as a one-step GTID enablement command. MySQL documents a stepwise online transition through `enforce_gtid_consistency`, `OFF_PERMISSIVE`, and `ON_PERMISSIVE`, so the snippet now reflects that sequence.
- The MySQL replication comments used "multi-master" for Group Replication. Updated this to MySQL's documented "multi-primary" terminology.
- The Aurora comparison listed PostgreSQL 11-16 compatibility and 128 TB storage. AWS documentation now lists Aurora PostgreSQL support through PostgreSQL 17 and 256 TiB storage for supported versions, so those values were updated.
- The Aurora MySQL comparison listed MySQL 5.7/8.0 compatibility and 128 TB storage. AWS documentation now includes Aurora MySQL 8.4 and 256 TiB storage for supported versions, so those values were updated.

## Review Notes
Some performance recommendations in the post are workload-dependent generalizations rather than deterministic rules. They are broadly reasonable for a high-level comparison, but future revisions could add benchmark caveats and version-specific notes for PostgreSQL 18/MySQL 8.4 behavior.
