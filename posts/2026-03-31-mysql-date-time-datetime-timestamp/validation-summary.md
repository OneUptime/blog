# Validation Summary: How to Use DATE, TIME, DATETIME, TIMESTAMP in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL date and time data types (DATE, TIME, DATETIME, TIMESTAMP)
- MySQL fractional seconds precision
- MySQL timezone handling
- MySQL auto-initialization and auto-update (DEFAULT CURRENT_TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)
- MySQL date/time functions (NOW, CURDATE, CURTIME, DATE_FORMAT, DATE_ADD, DATEDIFF, TIMESTAMPDIFF, TIMEDIFF)

## Sources Consulted
- MySQL 8.0 Reference Manual: Date and Time Data Types — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-types.html
- MySQL 8.0 Reference Manual: Date and Time Type Storage Requirements — https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html#data-types-storage-reqs-date-time
- MySQL 8.0 Reference Manual: Fractional Seconds in Time Values — https://dev.mysql.com/doc/refman/8.0/en/fractional-seconds.html
- MySQL 8.0 Reference Manual: Automatic Initialization and Updating for TIMESTAMP and DATETIME — https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html
- MySQL 8.0 Reference Manual: Date and Time Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found

1. **TIME storage size in mermaid diagram**: The mermaid diagram listed TIME as "3-4 bytes" but TIME can require up to 6 bytes (3 base + 3 for fractional seconds precision 5-6). Fixed to "3-6 bytes".

2. **Fractional seconds claim included DATE**: The post stated "All four types support fractional seconds" but DATE does not support fractional seconds — only TIME, DATETIME, and TIMESTAMP do. Fixed to explicitly name the three types that support fractional seconds and note that DATE does not.

3. **Inconsistent sample output in DATE section**: The ages (35, 40, 32) and tenure_months (81, 60, 42) shown in the example output could not all be true for any single value of CURDATE(). The ages are consistent with a date around 2026-03-15, but at that date Alice's tenure is 93 months (not 81) and Bob's is 72 months (not 60). Fixed tenure_months to 93 and 72 respectively.

4. **Misleading "Need auto-update?" in DATETIME vs TIMESTAMP flowchart**: The decision flowchart used "Need auto-update?" as a differentiator suggesting only TIMESTAMP supports DEFAULT CURRENT_TIMESTAMP and ON UPDATE CURRENT_TIMESTAMP. In reality, DATETIME has supported both since MySQL 5.6.5 (the post itself demonstrates DATETIME with DEFAULT CURRENT_TIMESTAMP in the calendar_events example). Changed the label to "Want automatic UTC storage?" which is the actual differentiator between the two types.

## Review Notes
- The comment in the Timezone Behavior section ("DATETIME is unaffected by timezone changes") followed by `SELECT NOW()` is slightly misleading since NOW() does reflect the session timezone. However, the general point about stored DATETIME values not being converted is correct and well-established elsewhere in the post.
- The custom column comment `-- 1=Monday to 7=Sunday` in the TIME section is a user-defined convention, not MySQL's DAYOFWEEK() function (which uses 1=Sunday to 7=Saturday). This is fine since it's defining custom column semantics.
- The TIMESTAMP range upper bound (2038-01-19 03:14:07 UTC) is the well-known Y2038 problem. MySQL 8.0.28+ has improved support but the 4-byte TIMESTAMP limit remains as stated.
