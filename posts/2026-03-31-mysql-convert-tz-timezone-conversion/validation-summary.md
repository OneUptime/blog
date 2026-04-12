# Validation Summary: How to Use MySQL CONVERT_TZ() for Timezone Conversion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CONVERT_TZ function, DATETIME/TIMESTAMP types, timezone tables)
- SQL (SELECT, WHERE, GROUP BY, CASE expressions)

## Sources Consulted
- MySQL 8.0 Reference Manual: CONVERT_TZ() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_convert-tz
- MySQL 8.0 Reference Manual: Time Zone Support — https://dev.mysql.com/doc/refman/8.0/en/time-zone-support.html
- MySQL 8.0 Reference Manual: mysql_tzinfo_to_sql — https://dev.mysql.com/doc/refman/8.0/en/mysql-tzinfo-to-sql.html
- IANA Time Zone Database (for DST transition dates verification)
- UK Government / EU directive on DST: last Sunday of March at 1:00 UTC
- US DST rules: second Sunday of March at 2:00 AM local time
- Australian DST rules: first Sunday of April (end of AEDT)

## Issues Found
1. **Incorrect London time in the output table (line 77)**: The output for `Europe/London` on `2026-03-31 14:00:00 UTC` was shown as `2026-03-31 14:00:00` (UTC+0). However, British Summer Time (BST, UTC+1) begins on the last Sunday of March, which in 2026 is March 29. By March 31, BST is in effect, so the correct converted time is `2026-03-31 15:00:00`. Fixed the output value from `14:00:00` to `15:00:00`.

## Review Notes
- The "Filter by Local Day Boundary" section applies CONVERT_TZ to the column in the WHERE clause, which the Best Practices section later correctly identifies as preventing index usage. This is not an error — it serves a pedagogical purpose by showing the pattern before explaining the optimization — but readers should note the Best Practices advice to convert filter values instead.
- The TIMESTAMP section uses `@@session.time_zone` as the `from_tz` argument. This is a valid and common pattern, but note that if the session timezone is set to the default value `'SYSTEM'`, CONVERT_TZ will return NULL because `'SYSTEM'` is not a recognized timezone name. This works correctly when the session timezone is set to an explicit named zone or numeric offset.
- All SQL syntax is correct and uses current, non-deprecated MySQL features.
- The `mysql_tzinfo_to_sql` command and verification query are correct.
- Named timezone identifiers (America/New_York, Europe/London, Asia/Kolkata, Australia/Sydney, America/Los_Angeles, America/Chicago) are all valid IANA timezone names.
