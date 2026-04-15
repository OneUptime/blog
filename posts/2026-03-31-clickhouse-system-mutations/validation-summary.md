# Validation Summary: How to Use system.mutations to Track Ongoing Mutations in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system.mutations table, system.parts table)
- SQL (ClickHouse SQL dialect)
- MergeTree engine family (ReplacingMergeTree, CollapsingMergeTree)
- ALTER TABLE mutations (UPDATE, DELETE)
- KILL MUTATION statement
- Bash scripting (clickhouse-client CLI)

## Sources Consulted
- ClickHouse official documentation: system.mutations table (https://clickhouse.com/docs/en/operations/system-tables/mutations)
- ClickHouse official documentation: ALTER UPDATE (https://clickhouse.com/docs/en/sql-reference/statements/alter/update)
- ClickHouse official documentation: ALTER DELETE (https://clickhouse.com/docs/en/sql-reference/statements/alter/delete)
- ClickHouse official documentation: KILL MUTATION (https://clickhouse.com/docs/en/sql-reference/statements/kill)
- ClickHouse official documentation: mutations_sync setting (https://clickhouse.com/docs/en/operations/settings/settings#mutations_sync)
- ClickHouse official documentation: MergeTree settings including finished_mutations_to_keep

## Issues Found

### 1. Incorrect claim about mutation retention (Common Pitfalls section)
- **What was wrong:** The post stated "Completed mutations are retained in `system.mutations` indefinitely until the server is restarted or the history is cleared."
- **What was changed:** Corrected to: "Completed mutations are retained in `system.mutations` based on the `finished_mutations_to_keep` MergeTree engine setting. Older entries are automatically deleted."
- **Why:** The official documentation states that finished mutation entries are governed by the `finished_mutations_to_keep` storage engine parameter, and older entries are automatically purged. They are not retained indefinitely until restart.

### 2. Broken "Estimate Time Remaining" query
- **What was wrong:** The `total` CTE used `ARRAY JOIN parts_to_do_names` on `system.mutations` to compute `total_parts`. However, `parts_to_do_names` only contains the names of parts *still remaining* to be mutated (identical to `parts_to_do` in count). This means `total_parts` always equals `parts_to_do`, making `parts_done` always 0 and `estimated_sec_remaining` always NULL.
- **What was changed:** Replaced the `total` CTE to query `system.parts WHERE active` instead, counting total active parts per table. Also removed the per-`mutation_id` grouping and join key since `system.parts` provides per-table totals. This gives a working approximation of total parts the mutation needs to process.
- **Why:** `system.mutations` does not store the initial total number of parts when a mutation was submitted. The total active parts count from `system.parts` is the standard proxy for estimating mutation progress.

## Review Notes
- The column table in the post is labeled "Key columns" and omits some columns present in the official docs (`parts_in_progress_names`, `parts_postpone_reasons`, `is_killed`, `latest_fail_error_code_name`). This is acceptable since the post focuses on the most operationally useful columns.
- The `mutations_sync` setting also supports value `3` (wait for active replicas only, SharedMergeTree-specific), which the post doesn't mention. This is fine since it's a specialized case.
- The time estimation query using `system.parts` is an approximation — it assumes the total active parts count is a reasonable proxy for the mutation's total work scope. This is standard practice but not perfectly precise (merges, new inserts, etc. can affect the count).
- All SQL syntax, function names (`left`, `dateDiff`, `nullIf`, `round`, `length`), and ClickHouse-specific features (`FORMAT PrettyCompactNoEscapes`, `SETTINGS mutations_sync`) are correct.
- The bash monitoring script is functional and correctly uses `clickhouse-client --query`.
