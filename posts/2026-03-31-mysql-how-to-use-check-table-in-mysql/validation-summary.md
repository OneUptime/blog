# Validation Summary: How to Use CHECK TABLE in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (CHECK TABLE statement)
- MyISAM and InnoDB storage engines
- mysqlcheck command-line utility
- MySQL Event Scheduler

## Sources Consulted
- MySQL 8.0 Reference Manual — CHECK TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/check-table.html
- MySQL 8.0 Reference Manual — mysqlcheck: https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html

## Issues Found

1. **QUICK option description was inaccurate**: The post described QUICK as "Checks only that index pages are correctly linked" which reverses the meaning. Per MySQL docs, QUICK means "Do not scan the rows to check for incorrect links." Fixed to match the official description.

2. **MEDIUM option description used incorrect terminology**: The post described MEDIUM as "Checks row-column links" which is not standard MySQL terminology. Per MySQL docs, MEDIUM "Scans rows to verify that deleted links are valid. This also calculates a key checksum for the rows and verifies this with a calculated checksum for the keys." Fixed to accurately reflect the documented behavior.

3. **Missing `note` Msg_type value**: The post listed status, info, warning, and error as Msg_type values but omitted `note`, which is a valid Msg_type per the MySQL docs. Added `note` to the list.

## Review Notes
- The FAST, CHANGED, MEDIUM, and EXTENDED check options are ignored for InnoDB tables and only apply to MyISAM. Only QUICK applies to both. The post does not explicitly call this out in the options table, though the InnoDB vs MyISAM section partially addresses this distinction. A future revision could add a note to the options table.
- The MySQL docs note that CHECK TABLE can remove corruption/dirty marks from table metadata, so calling it strictly "read-only" is a slight simplification. It does not modify user data.
- For InnoDB, the docs warn that CHECK TABLE can cause the server to exit if it encounters a corrupt page, to prevent error propagation. This is not mentioned in the post but could be relevant for readers working with potentially corrupted InnoDB tables.
