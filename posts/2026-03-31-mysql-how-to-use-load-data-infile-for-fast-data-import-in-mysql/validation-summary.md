# Validation Summary: How to Use LOAD DATA INFILE for Fast Data Import in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LOAD DATA INFILE statement)
- CSV/TSV/fixed-width file import
- MySQL server configuration (secure_file_priv, local_infile)

## Sources Consulted
- MySQL 8.0 Reference Manual: LOAD DATA Statement — https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual: Server System Variables (local_infile, secure_file_priv) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement (DISABLE KEYS / ENABLE KEYS) — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: STR_TO_DATE Function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_str-to-date

## Issues Found
1. **Error Handling section used wrong syntax for IGNORE**: The first example in "Error Handling Options" had the comment "Ignore errors for specific rows" but did not use the `IGNORE` keyword in the LOAD DATA statement. `IGNORE 1 ROWS` only skips the header — it does not ignore duplicate-key or constraint errors. Fixed by changing `INTO TABLE products` to `IGNORE INTO TABLE products` and updating the comment to clarify the behavior.

2. **Incorrect comment for SET GLOBAL local_infile**: The comment said "Enable local infile in session" but the command `SET GLOBAL local_infile = 1` is a server-wide (global) setting, not a session setting. Fixed the comment to say "Enable local infile on the server" and noted the required privilege.

3. **DISABLE KEYS only works for MyISAM**: The `ALTER TABLE ... DISABLE KEYS` tip in the Performance section had no caveat that this is a MyISAM-only feature and has no effect on InnoDB tables (the default storage engine since MySQL 5.5). Added a parenthetical note clarifying this limitation.

## Review Notes
- The "20x or more faster" claim in the introduction is a reasonable ballpark consistent with MySQL documentation and benchmarks, though actual performance varies by workload.
- The fixed-width import example using `FIELDS TERMINATED BY ''` with a single user variable and SUBSTR is a valid technique, though it relies on the entire line being read into one variable when no field delimiter is specified.
- The `SET autocommit = 0` tip in Performance is technically correct but has limited benefit for InnoDB LOAD DATA since the statement is already atomic by default when autocommit is on. It can help when running multiple LOAD DATA statements in sequence.
- For InnoDB bulk loading performance, users may want to consider `SET unique_checks = 0` and `SET foreign_key_checks = 0` as alternatives to the MyISAM-specific DISABLE KEYS. This could be a useful future addition.
