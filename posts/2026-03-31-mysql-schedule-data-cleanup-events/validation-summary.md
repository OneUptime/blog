# Validation Summary: How to Schedule Data Cleanup Jobs with MySQL Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Event Scheduler
- MySQL `information_schema.EVENTS`
- SQL `DELETE` with `LIMIT` for batch operations
- SQL `INSERT INTO ... SELECT` for archiving patterns

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE EVENT Statement: https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual — Event Scheduler Overview: https://dev.mysql.com/doc/refman/8.0/en/events-overview.html
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA EVENTS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html
- MySQL 8.0 Reference Manual — DELETE Statement: https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual — Operator Precedence: https://dev.mysql.com/doc/refman/8.0/en/operator-precedence.html

## Issues Found
1. **SQL operator precedence bug in the monitoring query**: The `WHERE` clause used `AND` mixed with `OR` without parentheses. Because `AND` has higher precedence than `OR`, the query `WHERE EVENT_SCHEMA = 'mydb' AND EVENT_NAME LIKE '%purge%' OR EVENT_NAME LIKE '%cleanup%' OR EVENT_NAME LIKE '%archive%'` would match `cleanup` and `archive` events from any schema, not just `mydb`. Fixed by wrapping the `OR` conditions in parentheses: `AND (... LIKE '%purge%' OR ... LIKE '%cleanup%' OR ... LIKE '%archive%')`.

2. **Misleading description in Example 4**: The introductory text said "delete in small batches with a loop" but the code does not use a loop construct — it relies on running a `DELETE ... LIMIT 1000` event every 5 minutes. Changed to "delete in small batches using a frequently scheduled event" to accurately describe the approach.

## Review Notes
- Example 2 (archive and delete) has a minor TOCTOU concern: the `INSERT INTO ... SELECT` and the subsequent `DELETE` use separate `NOW()` calls, so a row right at the 90-day boundary could theoretically be archived but not deleted (or vice versa). In practice this is negligible for 90-day-old data, but wrapping both statements in an explicit transaction or using a stored procedure with a shared cutoff variable would be more robust.
- The `STARTS NOW()` in Example 1 is technically redundant since omitting `STARTS` from an `EVERY` schedule defaults to the current timestamp, but it is not incorrect and arguably improves readability.
- All interval units correctly use the singular form (`HOUR`, `WEEK`, `MONTH`, `MINUTE`) as required by MySQL event syntax.
