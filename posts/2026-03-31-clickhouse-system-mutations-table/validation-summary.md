# Validation Summary: How to Use system.mutations Table in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- `system.mutations` system table
- `ALTER TABLE ... UPDATE` and `ALTER TABLE ... DELETE` statements
- `KILL MUTATION` statement
- `system.merges` system table (referenced for comparison)

## Sources Consulted
- ClickHouse official documentation: system.mutations table (https://clickhouse.com/docs/en/operations/system-tables/mutations)
- ClickHouse official documentation: KILL MUTATION (https://clickhouse.com/docs/en/sql-reference/statements/kill)
- ClickHouse official documentation: ALTER TABLE UPDATE (https://clickhouse.com/docs/en/sql-reference/statements/alter/update)
- ClickHouse official documentation: ALTER TABLE DELETE (https://clickhouse.com/docs/en/sql-reference/statements/alter/delete)

## Issues Found
1. **Incorrect description of mutation history retention** (line 15): The post originally stated that `system.mutations` "retains historical mutation records until they are cleared." This is misleading. The official documentation states that finished mutation entries are retained based on the `finished_mutations_to_keep` storage engine parameter, and older entries are automatically deleted. Fixed by clarifying the retention mechanism.

## Review Notes
- All SQL queries are syntactically correct and use valid column names from the `system.mutations` table.
- The `KILL MUTATION` syntax is correct per official documentation.
- The description of mutations as asynchronous background processes is accurate.
- The post correctly notes that canceling a mutation does not undo changes already applied to completed parts.
- The post uses a subset of available columns (omitting `parts_in_progress_names`, `is_killed`, `latest_fail_error_code_name`, etc.), which is appropriate for a practical guide.
- The post does not mention that updating primary key or partition key columns is unsupported, or that lightweight `DELETE FROM` is a faster alternative to `ALTER TABLE DELETE`. These are not errors but could be useful additions in a future update.
