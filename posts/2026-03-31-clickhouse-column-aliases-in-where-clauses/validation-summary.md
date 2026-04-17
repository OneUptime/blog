# Validation Summary: How to Use Column Aliases in ClickHouse WHERE Clauses

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- ClickHouse (tested on version 26.4.1)
- Standard SQL (for comparison)
- ClickHouse SELECT/WHERE/HAVING semantics
- ClickHouse MATERIALIZED columns
- ClickHouse `enable_analyzer` setting
- ClickHouse `prefer_column_name_to_alias` setting

## Sources Consulted
- ClickHouse Syntax docs: https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse SELECT WHERE docs: https://clickhouse.com/docs/sql-reference/statements/select/where
- ClickHouse settings docs (`enable_analyzer`): https://clickhouse.com/docs/operations/settings/settings#enable_analyzer
- ClickHouse issue #23194 "Describe how identifiers in SELECT queries are resolved": https://github.com/ClickHouse/ClickHouse/issues/23194
- Live verification against the public ClickHouse playground at https://play.clickhouse.com (version 26.4.1.272) — confirmed that aliases in WHERE work by default and that aggregate aliases in WHERE raise `ILLEGAL_AGGREGATION`.

## Issues Found

1. **Incorrect core premise.** The original post claimed ClickHouse "follows [standard SQL] rule by default" for aliases in WHERE. This is wrong — ClickHouse has supported SELECT aliases in WHERE for non-aggregate expressions for years as a non-standard extension. Verified live: `SELECT number * 2 AS doubled FROM numbers(5) WHERE doubled > 4` returns `6, 8` on ClickHouse 26.4 with default settings. The opening paragraph was rewritten to describe the actual behavior.

2. **"The Problem" example mislabeled.** The post showed a non-aggregate alias reference in WHERE and claimed it fails in "ClickHouse by default" with `Error: column 'duration_sec' does not exist`. In reality it succeeds in ClickHouse. Fixed by clarifying that this only fails in standard SQL, while ClickHouse accepts it; then reframing the remaining sections as alternative patterns (portable SQL, aggregate filters, reused expressions, column/alias conflicts).

3. **Solution 3 was factually muddled.** It claimed `SET enable_analyzer = 1` was needed to enable alias reuse, but (a) aliases in WHERE work in both old and new analyzer, (b) `enable_analyzer` is enabled by default in modern ClickHouse (confirmed via `SELECT getSetting('enable_analyzer')` → `true` on 26.4), and (c) the example underneath used HAVING, not WHERE alias — duplicating the HAVING section. Rewrote this section as a straightforward description of the ClickHouse extension: direct alias reference in WHERE works without any setting, with caveats noted about aggregate aliases (`ILLEGAL_AGGREGATION`) and `prefer_column_name_to_alias` for alias/column name shadowing.

4. **Summary corrected.** The summary repeated the incorrect claim about standard SQL evaluation order being followed. Rewrote to reflect that ClickHouse does allow alias use in WHERE, while the other patterns remain useful for aggregates, portable SQL, reuse, and ambiguity avoidance.

## Review Notes

- Solution 1 (repeat expression), Solution 2 (subquery / CTE), the HAVING example, and the MATERIALIZED column example are all syntactically and semantically correct in ClickHouse and were left unchanged.
- The `countIf(status_code >= 500)` and `round(..., 2)` functions used in the HAVING example are valid ClickHouse aggregate / numeric functions.
- The `ALTER TABLE ... ADD COLUMN ... MATERIALIZED` syntax for defining a materialized column is correct. Worth noting (not added to the post to avoid scope creep) that existing rows are not automatically backfilled — only new inserts get the value — which can surprise readers filtering over historical data.
- Did not restructure the post per the review guidelines; minimal fixes were applied within the existing sections.
