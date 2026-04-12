# Validation Summary: How to Configure MySQL Server Time Zone

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL (DDL and session/global variable commands)
- Linux systemd service management
- mysql_tzinfo_to_sql utility

## Sources Consulted
- MySQL 8.0 Reference Manual, Section 7.1.15 "MySQL Server Time Zone Support" — https://dev.mysql.com/doc/refman/8.0/en/time-zone-support.html
- MySQL 8.0 Reference Manual, INSERT Statement — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual, Option Files — https://dev.mysql.com/doc/refman/8.0/en/option-files.html
- MySQL 8.0 Reference Manual, Server System Variables (time_zone) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_time_zone

## Issues Found

1. **`FLUSH TABLES` presented as alternative to restart after loading timezone data (line ~89-93).**
   - **What was wrong:** The post stated "restart MySQL or run: `FLUSH TABLES;`" after loading timezone data with `mysql_tzinfo_to_sql`. MySQL caches timezone information in memory separately from the table cache, and `FLUSH TABLES` does not clear the timezone cache. The official MySQL documentation explicitly states: "restart the server so that it does not continue to use any previously cached time zone data."
   - **What was changed:** Replaced the `FLUSH TABLES` alternative with a second `sudo systemctl restart mysql` command, making it clear that a restart is required.

2. **`SET GLOBAL time_zone = 'UTC'` without noting timezone table prerequisite (line ~32).**
   - **What was wrong:** The post used the named timezone `'UTC'` in the `SET GLOBAL` example without noting that named timezones require the timezone tables to be populated. Without loaded tables, this command fails with `ERROR 1298 (HY000): Unknown or incorrect time zone: 'UTC'`. The timezone table loading section appeared later in the post.
   - **What was changed:** Changed the example to use `'+00:00'` (which always works without timezone tables) and added a note explaining that named zones like `'UTC'` require timezone tables to be loaded first.

3. **`default-time-zone = UTC` unquoted in my.cnf and missing prerequisite note (line ~65-67).**
   - **What was wrong:** The named timezone value lacked quotes (MySQL documentation consistently shows quoted values for this option), and there was no note that named timezones in my.cnf require timezone tables — which would cause MySQL to fail to start if tables aren't loaded.
   - **What was changed:** Added quotes around `'UTC'` and added a parenthetical note that named timezones require timezone tables to be loaded.

4. **`INSERT INTO demo VALUES ();` incorrect syntax (line ~126).**
   - **What was wrong:** The MySQL INSERT documentation states that when both the column list and VALUES list are empty, the correct syntax is `INSERT INTO tbl_name () VALUES();` with an explicit empty column list. Without the empty column list `()` after the table name, MySQL expects values for every column in the VALUES clause.
   - **What was changed:** Changed to `INSERT INTO demo () VALUES ();`.

## Review Notes
- The TIMESTAMP vs DATETIME explanation is accurate and well-presented.
- The `@@global.time_zone` and `@@session.time_zone` variable references are correct.
- The `mysql_tzinfo_to_sql` usage and path `/usr/share/zoneinfo` are correct for standard Linux installations.
- The `connectionInitSql` / `initCommand` pattern for connection pools is a valid general approach, though specific option names vary by driver (e.g., HikariCP uses `connectionInitSql`, MySQL Connector/J uses `sessionVariables`).
