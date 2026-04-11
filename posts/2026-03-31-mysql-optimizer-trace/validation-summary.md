# Validation Summary: How to Use the Optimizer Trace in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+, 8.0+)
- MySQL Optimizer Trace (`information_schema.OPTIMIZER_TRACE`)
- MySQL JSON functions (`JSON_EXTRACT`)
- MySQL system variables (`optimizer_trace`, `optimizer_trace_max_mem_size`, `optimizer_trace_limit`)

## Sources Consulted
- MySQL 8.4 Reference Manual - Tracing Examples: https://dev.mysql.com/doc/refman/8.4/en/tracing-example.html
- MySQL 8.4 Reference Manual - INFORMATION_SCHEMA OPTIMIZER_TRACE Table: https://dev.mysql.com/doc/refman/8.4/en/information-schema-optimizer-trace-table.html
- MySQL 8.4 Reference Manual - System Variables Controlling Tracing: https://dev.mysql.com/doc/refman/8.4/en/system-variables-controlling-tracing.html
- MySQL Developer Documentation - Optimizer Trace: https://dev.mysql.com/doc/dev/mysql-server/latest/PAGE_OPT_TRACE.html

## Issues Found

### 1. Incorrect comment about query pattern matching (line 97)
**What was wrong:** The comment `-- Enable trace with specific pattern (optional, limits trace to matching queries)` falsely claimed that `one_line=off` limits tracing to matching queries. The `optimizer_trace` variable supports only three flags: `enabled`, `one_line`, and `end_marker`. The `one_line` flag controls JSON whitespace formatting, not query filtering. MySQL's optimizer trace does not support pattern-based query filtering.
**What was changed:** Replaced the comment with an accurate description: `-- Enable trace with compact formatting disabled (one_line=off is the default)`. Also added a clarifying comment to `optimizer_trace_limit` noting it keeps only the most recent trace and is the default.

### 2. Incorrect JSON trace structure (lines 39-59)
**What was wrong:** The example JSON showed `join_preparation` and `join_optimization` as sibling properties within a single step object. In the actual MySQL optimizer trace output, each phase (`join_preparation`, `join_optimization`, `join_execution`) is a separate object in the top-level `steps` array. Additionally, the internal structure was flattened — `table_scan` and `potential_range_indexes` are nested under `rows_estimation` → `range_analysis`, and `best_access_path` is nested under `considered_execution_plans`.
**What was changed:** Restructured the JSON example to reflect the actual trace output hierarchy with separate step objects and correct nesting of `rows_estimation` and `considered_execution_plans`.

### 3. Fabricated `chosen_access_method` field (line 54)
**What was wrong:** The trace example used `"chosen_access_method": { "type": "ref", "index": "idx_status" }`, which does not exist in MySQL's optimizer trace output. In the real trace, each entry in `considered_access_paths` has a `"chosen": true/false` boolean indicating which path was selected.
**What was changed:** Removed the fabricated `chosen_access_method` field and added `"chosen": true` / `"chosen": false` to the individual access path entries, matching the actual trace format.

## Review Notes
- The `optimizer_trace_max_mem_size` is set to 1048576 (1 MB), which is already the default in MySQL 8.0+. This is technically correct but redundant on modern MySQL versions.
- The `optimizer_trace_limit = 1` is also the default value. Both settings are harmless as explicit documentation of intent.
- The `JSON_EXTRACT(TRACE, '$.steps[*].join_optimization')` query will work but returns an array with `null` entries for non-matching step objects (since `join_preparation` and `join_execution` steps don't have a `join_optimization` key). This is functional but may surprise users.
- The SELECT query in the "Enabling" section uses `c.name` without it being in the GROUP BY clause. This works in MySQL 5.7.6+ due to functional dependency detection (the join on `c.id` primary key makes `c.name` functionally dependent on `o.id`), but would fail on older versions or with strict `ONLY_FULL_GROUP_BY` without functional dependency support.
