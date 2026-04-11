# Validation Summary: How to Use Liquibase for MySQL Database Migrations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Liquibase (v4.27.0)
- YAML changelog format
- SQL changelog format
- JDBC (MySQL Connector/J)

## Sources Consulted
- Liquibase official documentation: https://docs.liquibase.com/
- Liquibase YAML changelog format: https://docs.liquibase.com/concepts/changelogs/yaml-format.html
- Liquibase SQL changelog format: https://docs.liquibase.com/concepts/changelogs/sql-format.html
- Liquibase CLI commands reference: https://docs.liquibase.com/commands/home.html
- Liquibase properties file documentation: https://docs.liquibase.com/concepts/connections/creating-config-properties.html
- Liquibase GitHub releases: https://github.com/liquibase/liquibase/releases
- MySQL Connector/J documentation: https://dev.mysql.com/doc/connector-j/en/

## Issues Found
1. **Master changelog referenced wrong file extension for SQL changeset**: The master changelog (`db.changelog-master.yaml`) included `db/changelog/002-create-orders.yaml`, but the corresponding changeset was written in SQL format as `db/changelog/002-create-orders.sql`. Liquibase include paths must match the actual file name and extension. Changed the master changelog entry from `002-create-orders.yaml` to `002-create-orders.sql` so it matches the SQL-formatted changeset file shown in the tutorial.

## Review Notes
- The `brew install liquibase` command and the tar.gz download URL for v4.27.0 are both valid installation methods.
- The `liquibase.properties` configuration uses correct property names (`url`, `username`, `password`, `driver`, `changeLogFile`) and the correct MySQL Connector/J 8+ driver class (`com.mysql.cj.jdbc.Driver`).
- YAML changeset syntax is correct: `changeSet`, `createTable`, `constraints`, `defaultValueComputed`, and `rollback` all use the proper Liquibase YAML schema.
- SQL changeset format is correct: `-- liquibase formatted sql` header, `-- changeset author:id` directive, and `-- rollback` comment syntax are all valid.
- All CLI commands (`update`, `status`, `rollbackCount`, `rollback`, `tag`, `diff`) use correct syntax and flags.
- The `DATABASECHANGELOG` tracking table name is accurate.
- The post correctly notes that Liquibase supports SQL, YAML, XML, and JSON changelog formats.
