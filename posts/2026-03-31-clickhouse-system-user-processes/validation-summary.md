# Validation Summary: How to Use system.user_processes in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, SQL queries, quota configuration)
- `system.user_processes` system table
- `system.processes` system table
- `KILL QUERY` statement
- ClickHouse quota configuration (users.xml)

## Sources Consulted
- ClickHouse official documentation: system.user_processes table (https://clickhouse.com/docs/en/operations/system-tables/user_processes)
- ClickHouse official documentation: system.processes table (https://clickhouse.com/docs/en/operations/system-tables/processes)
- ClickHouse official documentation: KILL statement (https://clickhouse.com/docs/en/sql-reference/statements/kill)
- ClickHouse official documentation: Quotas (https://clickhouse.com/docs/en/operations/quotas)
- ClickHouse GitHub PR #50492 (introduction of system.user_processes)

## Issues Found

### 1. Fabricated columns in Key Columns table (CRITICAL)
**What was wrong:** The blog listed 10 columns for `system.user_processes`, but the table only has 4 columns according to official documentation: `user` (String), `memory_usage` (Int64), `peak_memory_usage` (Int64), and `ProfileEvents` (Map(LowCardinality(String), UInt64)). Six columns were fabricated: `query_count`, `initial_query_count`, `read_rows`, `read_bytes`, `written_rows`, `written_bytes`, and `total_elapsed`. The `ProfileEvents` column was entirely omitted.

**What was changed:** Replaced the Key Columns table with the correct 4 columns and added a note about useful ProfileEvents keys (SelectQuery, InsertQuery, SelectedRows, SelectedBytes, InsertedRows, InsertedBytes).

### 2. SQL query "Viewing Active Resource Usage by User" used non-existent columns
**What was wrong:** The query referenced `query_count`, `read_rows`, `read_bytes`, and `total_elapsed`, none of which exist as direct columns.

**What was changed:** Rewrote the query to use actual columns (`memory_usage`, `peak_memory_usage`) and extract relevant metrics from the `ProfileEvents` map.

### 3. SQL query "Finding the Highest Memory Consumer" used non-existent columns
**What was wrong:** Referenced `query_count` and `initial_query_count` which do not exist.

**What was changed:** Simplified the query to use only `memory_usage` and `peak_memory_usage`.

### 4. SQL query "Users with Many Concurrent Queries" was entirely based on non-existent columns
**What was wrong:** The query filtered on `query_count > 5` and computed `total_elapsed / query_count`, but neither column exists in `system.user_processes`.

**What was changed:** Rewrote the section to use `system.processes` with `GROUP BY user` and `HAVING count() > 5`, which achieves the same goal using correct tables and columns. Added explanatory text noting that `system.user_processes` does not have a query count column.

### 5. SQL query "Drilling Down: Step 1" used non-existent column
**What was wrong:** Step 1 query selected `query_count` which does not exist.

**What was changed:** Replaced with `formatReadableSize(memory_usage)` and `formatReadableSize(peak_memory_usage)`.

### 6. Mermaid diagram referenced non-existent data
**What was wrong:** The diagram showed query counts per user (e.g., "3 queries", "8 queries") and described aggregated data as "memory, rows, bytes" — implying direct columns that don't exist.

**What was changed:** Removed query count annotations from user nodes and updated the aggregation description to "memory_usage, peak_memory_usage, ProfileEvents per user".

## Review Notes
- The `system.user_processes` table was introduced in ClickHouse ~23.7/23.8 (PR #50492 merged June 2023). The blog does not mention version requirements, which is fine but readers on older versions may not have this table.
- The quota XML configuration section is technically correct and matches official documentation.
- The `KILL QUERY` syntax and `system.processes` column references are all correct.
- The `formatReadableSize()` function usage is correct throughout.
- The `ProfileEvents` keys referenced in the corrected queries (SelectQuery, SelectedRows, SelectedBytes, etc.) are standard ClickHouse profile events, but the exact set of available keys can vary by version. Readers should query `SELECT * FROM system.user_processes` to see what keys are populated in their environment.
