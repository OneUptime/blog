# Validation Summary: How to Roll Back Schema Migrations in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ALTER TABLE, system.mutations, KILL MUTATION, projections, data skipping indexes)
- golang-migrate (ClickHouse driver)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse ALTER TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse ALTER INDEX documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index
- ClickHouse ALTER PROJECTION documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/projection
- ClickHouse system.mutations table: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse KILL MUTATION: https://clickhouse.com/docs/en/sql-reference/statements/kill#kill-mutation
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- golang-migrate ClickHouse driver: https://github.com/golang-migrate/migrate/tree/master/database/clickhouse

## Issues Found

1. **Incorrect DROP COLUMN behavior description (line 43)**: The post claimed DROP COLUMN is "immediate for columns with defaults" and that "ClickHouse only removes the column metadata and stops reading the column from new parts." This was misleading. ClickHouse actually deletes the entire column files from disk (not just metadata), and the speed is due to columnar storage, not related to whether the column has a default. Fixed to: "This is fast because ClickHouse uses columnar storage - it deletes the entire column files from disk, which completes almost instantly."

2. **Incorrect mutation_id format and KILL MUTATION best practice (line 70)**: The example used `mutation_id = 'mutation_123'`, but ClickHouse mutation IDs follow the format `mutation_N.txt` (e.g., `mutation_3.txt`). Additionally, official docs recommend including `database` and `table` in the WHERE clause for safety. Fixed to: `KILL MUTATION WHERE database = 'default' AND table = 'events' AND mutation_id = 'mutation_3.txt'`.

3. **Incorrect golang-migrate connection string (line 98)**: The post used `clickhouse://localhost:9000/analytics` with the database as a path component. The golang-migrate ClickHouse driver requires the database as a query parameter: `clickhouse://localhost:9000?database=analytics`. Fixed the connection string format.

## Review Notes
- The `CREATE TABLE events_backup AS events` pattern copies structure only (no data), which the post correctly follows with an INSERT INTO ... SELECT to copy data. ClickHouse also supports `CREATE TABLE ... CLONE AS ...` for copying both structure and data in one operation, but the two-step approach shown is valid.
- The MODIFY COLUMN operation to change types is implemented as a mutation in ClickHouse, meaning it rewrites data on disk. The post's warning about downcasting is appropriate.
- The post correctly identifies DELETE mutations as irreversible, since they physically remove rows from parts.
