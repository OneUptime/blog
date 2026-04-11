# Validation Summary: How to Reset a MySQL Database to a Clean State

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Docker / Docker Compose
- Flyway (migration tool)
- Liquibase (migration tool)
- mysqldump
- Bash shell scripting

## Sources Consulted
- MySQL 8.0 Reference Manual — DROP DATABASE, CREATE DATABASE, GRANT, TRUNCATE TABLE, SET FOREIGN_KEY_CHECKS: https://dev.mysql.com/doc/refman/8.0/en/
- MySQL information_schema.TABLES documentation: https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- mysqldump documentation (--no-data, --routines, --triggers flags): https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- Docker tmpfs mounts documentation: https://docs.docker.com/engine/storage/tmpfs/
- Official MySQL Docker image documentation (docker-entrypoint-initdb.d behavior): https://hub.docker.com/_/mysql
- MySQL Docker entrypoint source code (init script guard logic): https://github.com/docker-library/mysql/blob/master/8.0/docker-entrypoint.sh
- Flyway CLI documentation: https://documentation.red-gate.com/flyway/usage/command-line
- Liquibase CLI documentation: https://docs.liquibase.com/commands/home.html

## Issues Found
1. **Misleading description of `/docker-entrypoint-initdb.d/` behavior**: The post originally stated that init scripts run "automatically on container start" and that "every container restart applies these scripts to a fresh database." This is incorrect in the general case — MySQL only executes these scripts when the data directory is empty (first initialization). The scripts are skipped on subsequent starts if data already exists. Fixed by clarifying that scripts run when the data directory is empty, and that the "every restart" behavior requires `tmpfs` from Method 4 to clear the data directory on each restart.

## Review Notes
- The `FLUSH PRIVILEGES` in Method 1 is technically unnecessary after a `GRANT` statement (MySQL automatically reloads the grant tables), but it is not incorrect and is a common defensive practice.
- The Liquibase command in Method 1 omits `--username` and `--password` flags, which assumes these are configured in a `liquibase.properties` file. This is a valid approach but could confuse readers copying commands directly.
- The `--triggers` flag in the `mysqldump` command is technically redundant since triggers are included by default, but explicitly specifying it is fine for clarity.
