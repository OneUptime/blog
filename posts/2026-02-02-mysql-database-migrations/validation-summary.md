# Validation Summary: How to Handle Database Migrations in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0 (schema, DDL, information_schema, performance_schema, ALGORITHM=INSTANT/INPLACE)
- Flyway 10.0.0 (CLI, configuration, Docker image, environment variables)
- Liquibase 4.25.0 (CLI, YAML changelog format, rollback)
- Percona Toolkit (`pt-online-schema-change`)
- Docker / Docker Compose (mysql:8.0, flyway/flyway, liquibase/liquibase images)
- GitHub Actions (CI/CD workflow)
- Bash shell scripting
- MySQL binary log point-in-time recovery (`mysqlbinlog`)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB INFORMATION_SCHEMA / Performance Schema tables (`data_locks`, `data_lock_waits`, `innodb_trx`): https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual — `INNODB_LOCKS` / `INNODB_LOCK_WAITS` removed: https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-system-tables.html
- MySQL 8.0 Reference Manual — `ALTER TABLE` ALGORITHM/LOCK options (INSTANT/INPLACE/NONE): https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — `TIMESTAMP` defaults and `ON UPDATE CURRENT_TIMESTAMP`: https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html
- MySQL 8.0 — `SHOW ENGINE INNODB STATUS`, `KEY_COLUMN_USAGE`
- Flyway 10 documentation — CLI flags (`-locations=`, `-baselineVersion=`), environment variables (`FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD`), download distribution layout
- Flyway Maven distribution: https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/10.0.0/
- Liquibase 4.25 documentation — YAML changelog, commands (`update`, `rollbackCount`, `rollback <tag>`, `rollbackToDate`, `updateSQL`, `tag`, `validate`, `generateChangeLog`, `clearCheckSums`), `defaultValueComputed`, `afterColumn`, `descending` index column option
- Liquibase GitHub release: https://github.com/liquibase/liquibase/releases/tag/v4.25.0
- Percona Toolkit `pt-online-schema-change` documentation (options `--alter`, `--max-load`, `--critical-load`, `--chunk-size`, `--no-drop-old-table`, DSN syntax)
- GitHub Actions documentation — workflow syntax, service containers, secrets

## Issues Found
- **Removed system table in MySQL 8.0**: The troubleshooting query under "Lock Wait Timeout" used `information_schema.innodb_lock_waits`, which was deprecated in MySQL 5.7 and removed in MySQL 8.0 (the post otherwise targets MySQL 8.0 throughout, including in the GitHub Actions and Docker Compose snippets). Updated the query to use `performance_schema.data_lock_waits` and joined on the renamed columns `blocking_engine_transaction_id` / `requesting_engine_transaction_id`. Added a comment noting the change so readers understand why.

## Review Notes
- The Liquibase YAML examples set `defaultValueComputed: CURRENT_TIMESTAMP` for `updated_at`, which only configures the `DEFAULT` clause and does not reproduce the `ON UPDATE CURRENT_TIMESTAMP` behavior used in the parallel native-SQL examples. This is a minor parity gap, not an error; readers who need the auto-update behavior would have to use a raw `sql` change or `modifyDataType` workaround.
- The `mysql ... -p "$DB_NAME"` invocations in the shell scripts will prompt interactively for the password (the `-p` flag with no attached value), which is the documented MySQL CLI behavior. This is fine for interactive use but won't work unattended; the CI/CD examples correctly use env-var-based authentication.
- `date +%s%3N` (millisecond resolution) is a GNU `date` extension and works on Linux (used by CI runners) but not on BSD/macOS `date`. Acceptable for the bash migration script's stated environment.
- Mermaid diagrams are syntactically valid.
- `docker-compose.yml` uses `version: '3.8'`, which is now informational-only under Compose V2 but still parses correctly.
- Liquibase command names use the older camelCase style (`rollbackCount`, `updateSQL`, `clearCheckSums`, etc.). These remain supported in 4.25 alongside the newer kebab-case forms (`rollback-count`, `update-sql`, `clear-check-sums`).
- The MySQL 8.0 default binary-log file basename is `binlog` (matching the `/var/lib/mysql/binlog.*` glob in the post); earlier MySQL versions used `mysql-bin` by default. The example is correct for MySQL 8.0 with default settings.
