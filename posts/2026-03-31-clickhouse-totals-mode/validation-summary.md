# Validation Summary: How to Use totals_mode Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- `totals_mode` setting
- `WITH TOTALS` modifier for `GROUP BY`
- `totals_auto_threshold` setting
- ClickHouse HTTP interface JSON format

## Sources Consulted
- ClickHouse official documentation — Settings: `totals_mode` (https://clickhouse.com/docs/en/operations/settings/settings#totals_mode)
- ClickHouse official documentation — GROUP BY WITH TOTALS modifier (https://clickhouse.com/docs/en/sql-reference/statements/select/group-by#with-totals-modifier)
- ClickHouse official documentation — FORMAT JSON output format (https://clickhouse.com/docs/en/interfaces/formats#json)

## Issues Found

### Issue 1: Wrong default value for `totals_mode`
- **What was wrong:** The post stated that `after_having_exclusive` is the default value of `totals_mode`. The actual default is `before_having`.
- **What was changed:** Moved the "(default)" annotation from `after_having_exclusive` to `before_having` in the bullet list.
- **Why:** The official ClickHouse documentation explicitly states `before_having` is the default.

### Issue 2: Incorrect description of `after_having_inclusive`
- **What was wrong:** The post described `after_having_inclusive` as "totals include rows that were excluded by HAVING." This is incorrect. The `after_having_inclusive` mode computes totals from rows that passed HAVING, plus any rows that overflowed the `max_rows_to_group_by` limit.
- **What was changed:** Updated the bullet description and the comparison table to accurately reflect the role of `max_rows_to_group_by` overflow rows.
- **Why:** The official documentation defines this mode in terms of `max_rows_to_group_by` overflow, not HAVING exclusions.

### Issue 3: Incorrect description of `after_having_auto` behavior
- **What was wrong:** The post stated that `after_having_auto` "falls back to `before_having`" when many groups are filtered out, and described the threshold condition in inverted terms ("filtered out" instead of "passed"). The actual behavior is that it switches between `after_having_inclusive` and `after_having_exclusive` based on the fraction of rows that *passed* HAVING.
- **What was changed:** Rewrote the description to correctly state that it behaves like `after_having_inclusive` when the passing fraction exceeds the threshold, and like `after_having_exclusive` otherwise.
- **Why:** The official documentation describes the auto mode as choosing between inclusive and exclusive, not falling back to `before_having`.

## Review Notes
- The SQL code examples are syntactically correct and demonstrate the feature well.
- The JSON output format example correctly shows the `"totals"` key structure.
- The `totals_auto_threshold` default of 0.5 is correct per official documentation.
