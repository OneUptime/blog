# Validation Summary: How to Use dateDiff() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse date/time functions (`dateDiff`, `toDate`, `toDateTime`, `today`, `now`, `coalesce`, `max`)

## Sources Consulted
- ClickHouse official documentation for `dateDiff`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#date_diff
- ClickHouse SQL reference for date/time data types and functions

## Issues Found

1. **Incomplete list of supported units** — The post originally stated supported units as only `'second'` through `'year'`. ClickHouse's `dateDiff` also supports `'nanosecond'`, `'microsecond'`, and `'millisecond'`. Updated the list in the "Function Signature" section to include the missing sub-second units.

2. **Incorrect timezone parameter usage in example** — The "Timezone-Aware Day Counts" example used `timezone` as a bare column reference (`dateDiff('day', last_login, now(), timezone)`). In ClickHouse, the timezone argument to `dateDiff` must be a constant string literal (it is consumed at query-planning time by `extractTimeZoneNameFromFunctionArguments`), not a column. Replaced the column reference with a constant string `'America/New_York'` and added a note clarifying the constant requirement.

## Review Notes

- All other SQL examples are syntactically valid ClickHouse SQL.
- The use of column aliases in `WHERE` (`days_ago`, `days_since_login`) and `HAVING` (`days_inactive`) clauses is valid in ClickHouse — this is a documented ClickHouse extension over standard SQL.
- The function signature `dateDiff(unit, start, end[, timezone])` is correct.
- The behavior described — calendar-aware, signed integer return, counting boundaries crossed — matches official documentation.
- Aggregates (e.g. `max(event_time)`) inside `dateDiff` work as expected since `dateDiff` is a regular scalar function.
- The post does not mention the function aliases (`date_diff`, `DATE_DIFF`, `timestampDiff`, `TIMESTAMP_DIFF`, `timestamp_diff`); not an error, but worth noting for completeness in a future revision.
