# Validation Summary: Daily, Weekly, or Monthly Partitions? Choose From Retention and Query Windows

## Status

validated

## Post Type

Technical guide / Capacity-planning reference

## Technologies Covered

- PostgreSQL declarative range partitioning
- PostgreSQL partition pruning and query planning
- Time-series retention and partition lifecycle management
- PostgreSQL indexes, vacuum, analyze, backup, and restore considerations
- PostgreSQL date/time types, UTC boundaries, ISO weeks, and daylight-saving behavior
- PostgreSQL catalog and sizing functions
- Prepared statements and `EXPLAIN ANALYZE`

## Sources Consulted

- PostgreSQL Table Partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL `CREATE TABLE`: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL `ALTER TABLE`: https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL `EXPLAIN`: https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL `PREPARE`: https://www.postgresql.org/docs/current/sql-prepare.html
- PostgreSQL Date/Time Functions and Operators: https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL Date/Time Types: https://www.postgresql.org/docs/current/datatype-datetime.html
- PostgreSQL Comparison Functions and Operators: https://www.postgresql.org/docs/current/functions-comparison.html
- PostgreSQL Database Object Size and Partitioning Information Functions: https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-DBSIZE and https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION
- PostgreSQL System Catalog Information Functions: https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-INFO-CATALOG
- PostgreSQL `pg_class` catalog: https://www.postgresql.org/docs/current/catalog-pg-class.html

## Issues Found

1. The query-window examples understated how many boundary partitions a range can touch. A six-hour interval can cross a month boundary, and an arbitrary 90-day interval can touch 90 or 91 daily partitions and three to five monthly partitions. Corrected both counts to account for boundary alignment.
2. The write-capacity explanation stated that hourly partitions all remain on the same server without accounting for PostgreSQL's support for foreign-table partitions. Qualified the statement as applying to local partitions, which preserves the intended point that finer local partitioning is not sharding.
3. The partition DDL used context-coerced string literals even though the post recommended typed UTC boundaries. Declared the example as a `timestamptz` case and changed both bounds to explicit `TIMESTAMP WITH TIME ZONE` constants so their offsets cannot be ignored through `timestamp without time zone` interpretation.
4. The parameterized `EXPLAIN` snippet was not directly executable in a normal SQL session because `$1` and `$2` had no surrounding prepared statement or protocol-bound values. Added `PREPARE` with explicit parameter types and `EXPLAIN ... EXECUTE` with representative typed values.
5. The future-coverage query only inventories existing partition bounds; it does not by itself detect missing coverage. Clarified that monitoring must compare those bounds with the expected schedule before alerting.
6. The default-partition explanation omitted the case where rows already belong to the new explicit bound. Clarified that those rows must first be removed from the attached default, and that PostgreSQL scans and locks a local default partition unless a valid check constraint proves the new range is absent.
7. The Partition Information Functions link targeted `functions-info.html`, but current PostgreSQL documentation places that anchor and `pg_partition_tree` on `functions-admin.html`. Corrected the URL.

## Review Notes

- The corrected SQL snippets were smoke-tested successfully on PostgreSQL 14.17 and checked against the current PostgreSQL 18 documentation. The APIs used are also present in all currently supported PostgreSQL releases.
- Production benchmarks should preserve the application's actual prepared-statement lifecycle because PostgreSQL can select custom or generic plans under `plan_cache_mode = auto`, which can affect planning and pruning measurements.
