# Validation Summary: How to Use CONVERT_TZ() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CONVERT_TZ() function)
- SQL (datetime handling, time zone conversion)
- mysql_tzinfo_to_sql utility

## Sources Consulted
- MySQL 8.0 Reference Manual: CONVERT_TZ() function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_convert-tz
- MySQL 8.0 Reference Manual: Time Zone Support — https://dev.mysql.com/doc/refman/8.0/en/time-zone-support.html
- IANA Time Zone Database (for DST transition dates)
- US DST rules: 2024 DST starts March 10 at 2:00 AM local time (second Sunday of March)

## Issues Found
1. **Incorrect DST example result (line 96)**: The post claimed `CONVERT_TZ('2024-03-10 07:00:00', 'UTC', 'America/New_York')` returns `2024-03-10 02:00:00 (EST, UTC-5)`. This is wrong because US DST starts on March 10, 2024 at 2:00 AM EST, which is exactly 07:00 UTC. At that moment, clocks spring forward to 3:00 AM EDT (UTC-4), so the result is `03:00:00`, not `02:00:00`. The second line used March 11 which was also post-DST and therefore didn't effectively demonstrate the transition. **Fix**: Changed the first example to use March 9 (pre-DST) and the second to March 10 (post-DST), correctly showing `02:00 EST` vs `03:00 EDT` for the same UTC time of 07:00, which clearly demonstrates DST-aware conversion.

## Review Notes
- The "Filtering by Local Time" example uses `CURDATE()` which returns the server's date. If the server runs in UTC, this could produce unexpected results around midnight when the server date differs from the New York date. This is not technically wrong but could be noted in a future revision.
- All offset arithmetic in the other examples was verified correct.
- The `mysql_tzinfo_to_sql` command is the standard documented approach and is correct.
- The post correctly notes that named zones handle DST automatically while fixed offsets do not.
