# Validation Summary: How to Configure MySQL Lower Case Table Names Setting

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (general, with focus on 8.0)
- Docker (MySQL container configuration)
- `lower_case_table_names` system variable

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — `lower_case_table_names` (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_lower_case_table_names)
- MySQL 8.0 Reference Manual: Identifier Case Sensitivity (https://dev.mysql.com/doc/refman/8.0/en/identifier-case-sensitivity.html)
- Official MySQL Docker image documentation (https://hub.docker.com/_/mysql) — supported environment variables

## Issues Found

1. **Misleading comment in `lower_case_table_names=0` example (lines 41-43)**: The comment said "This fails - case mismatch" but then showed two SELECT statements that both succeed (since all three differently-cased tables were created above). This was contradictory. Fixed by replacing the comment with "Case must match exactly" and adding a third SELECT to show that each case variation finds its own distinct table.

2. **Non-standard Docker environment variable (line 85)**: The Docker command included `-e MYSQL_LOWER_CASE_TABLE_NAMES=1`, which is not a recognized environment variable in the official `mysql` Docker image. The official image supports `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, and a few others — but not `MYSQL_LOWER_CASE_TABLE_NAMES`. The correct approach (which was also present in the command) is to pass `--lower-case-table-names=1` as a server argument after the image name. Removed the invalid environment variable and kept only the correct command-line argument.

## Review Notes
- The setting values table (values 0, 1, 2) is accurate and well-structured.
- The MySQL 8.0 restriction about not changing the setting after initialization is correctly documented.
- The migration approach using `information_schema.tables` and `RENAME TABLE` is sound.
- The `table_name != LOWER(table_name)` comparison in the migration query is a correct way to identify mixed-case table names (this only works meaningfully when `lower_case_table_names=0`, which is the scenario where such migration is needed).
- The `information_schema` column name `table_name` is used in lowercase, which works fine in MySQL since identifier comparisons on information_schema columns are case-insensitive.
