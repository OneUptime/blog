# Validation Summary: How to Use WITH TOTALS in ClickHouse GROUP BY

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (GROUP BY, WITH TOTALS, HAVING, LIMIT)
- ClickHouse JSON output format

## Sources Consulted
- ClickHouse official documentation: GROUP BY WITH TOTALS modifier (https://clickhouse.com/docs/en/sql-reference/statements/select/group-by)
- ClickHouse source code: Settings.cpp and SettingsEnums.h for `totals_mode` default value and enum definitions (https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp)

## Issues Found
1. **Incorrect default for `totals_mode`**: The blog marked `after_having_auto` as the default value. The ClickHouse documentation states the default is `before_having`. Moved the "(default)" annotation to the correct row.
2. **Inaccurate `after_having_inclusive` description**: The blog described it as "Rows that passed WHERE, using post-HAVING aggregate state," which is misleading and incorrect. The actual behavior is that totals are computed from rows belonging to groups that passed HAVING, inclusive of any `max_rows_to_group_by` overflow rows. Updated the description accordingly.
3. **Clarified `before_having` description**: Added "(HAVING is ignored for totals)" to make it explicit that HAVING does not affect the totals row in this mode.

## Review Notes
- The `after_having_inclusive` vs `after_having_exclusive` distinction only matters when `max_rows_to_group_by` is set and some groups overflow. Without it, both modes compute totals from groups that passed HAVING. The blog does not discuss `max_rows_to_group_by`, which is fine for an introductory tutorial, but readers using that setting should consult the full docs.
- All SQL examples are syntactically correct and the expected output values are arithmetically verified.
- The JSON output structure (`data`, `totals`, `rows`, `rows_before_limit_at_least`) accurately reflects ClickHouse's JSON format.
- The claim that LIMIT does not affect the totals row is correct.
