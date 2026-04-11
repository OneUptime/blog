# Validation Summary: How to Use pt-online-schema-change for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Percona Toolkit (`pt-online-schema-change`)
- Linux package management (apt-get, yum)

## Sources Consulted
- Percona Toolkit official documentation for pt-online-schema-change (https://docs.percona.com/percona-toolkit/pt-online-schema-change.html)
- MySQL 8.0 Reference Manual — ALTER TABLE syntax (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- MySQL 8.0 Reference Manual — Data Type Default Values (https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html)

## Issues Found
1. **Incorrect description of behavior without `--execute`**: The post originally stated "Without `--execute`, pt-osc runs in dry-run mode and only prints what it would do." This is inaccurate. Without either `--execute` or `--dry-run`, pt-online-schema-change performs some safety checks and then exits — it does not run in dry-run mode. A dry run requires the explicit `--dry-run` flag. Updated the sentence to accurately describe the behavior and direct users to use `--dry-run`.

## Review Notes
- The `MODIFY COLUMN description TEXT NOT NULL DEFAULT ''` example is valid on MySQL 8.0.13+ but would fail on MySQL versions prior to 8.0.13 (which did not allow default values on TEXT/BLOB columns). Since MySQL 5.7 reached end of life in October 2023, this is acceptable without a version caveat.
- The post correctly covers the most important aspects of pt-online-schema-change: basic usage, load control, dry runs, and limitations (PK requirement, foreign keys, existing triggers).
- All CLI flags (`--alter`, `--execute`, `--dry-run`, `--chunk-size`, `--sleep`, `--max-load`, `--critical-load`, `--alter-foreign-keys-method`) and their values are correct per the Percona Toolkit documentation.
