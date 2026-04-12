# Validation Summary: MySQL DATETIME vs TIMESTAMP: Which to Use

## Status
validated

## Post Type
Reference / Comparison Guide

## Technologies Covered
- MySQL DATETIME data type
- MySQL TIMESTAMP data type
- MySQL timezone handling
- MySQL fractional seconds precision

## Sources Consulted
- MySQL 8.0 Reference Manual: The DATE, DATETIME, and TIMESTAMP Types (https://dev.mysql.com/doc/refman/8.0/en/datetime.html)
- MySQL 8.0 Reference Manual: Data Type Storage Requirements (https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html)
- MySQL 8.0 Reference Manual: Automatic Initialization and Updating for TIMESTAMP and DATETIME (https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html)
- IANA Time Zone Database (America/New_York EDT/EST transitions)

## Issues Found

1. **Incorrect storage size description**: The introductory sentence in the Storage Size section stated "Both DATETIME and TIMESTAMP use 4-8 bytes" which is inaccurate. TIMESTAMP uses 4 bytes base (4-7 with fractional seconds) and DATETIME uses 5 bytes base (5-8 with fractional seconds). Reworded to avoid the misleading claim.

2. **Wrong UTC offset in timezone example**: The example showed 10:00 AM America/New_York on 2026-03-31 converting to 15:00 UTC, implying EST (UTC-5). However, March 31, 2026 falls during Eastern Daylight Time (EDT, UTC-4) since DST begins on the second Sunday of March. The correct UTC equivalent is 14:00. Changed from 15:00:00 to 14:00:00 and clarified "EDT" in the comment.

3. **Incorrect MySQL version for DATETIME DEFAULT CURRENT_TIMESTAMP**: The comment stated "MySQL 8.0 also supports DEFAULT CURRENT_TIMESTAMP for DATETIME" but this feature was introduced in MySQL 5.6.5, not 8.0. Corrected to "MySQL 5.6.5+".

## Review Notes
- The TIMESTAMP range upper bound of `2038-01-19 03:14:07` is correct and reflects the Y2038 problem (max 32-bit signed integer epoch value). Worth noting that MySQL may extend this in future versions.
- The recommendation table and summary guidance are sound and align with common best practices.
