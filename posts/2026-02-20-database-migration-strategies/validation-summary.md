# Validation Summary: How to Plan and Execute Database Migrations Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- SQL database migrations
- PostgreSQL
- MySQL
- gh-ost
- pt-online-schema-change
- pg_repack
- Flyway
- Liquibase
- Python
- psycopg2
- Bash

## Sources Consulted
- PostgreSQL ALTER TABLE documentation: https://www.postgresql.org/docs/17/sql-altertable.html
- PostgreSQL modifying tables documentation: https://www.postgresql.org/docs/current/ddl-alter.html
- PostgreSQL explicit locking documentation: https://www.postgresql.org/docs/16/explicit-locking.html
- gh-ost official GitHub documentation: https://github.com/github/gh-ost
- pg_repack official documentation: https://reorg.github.io/pg_repack/
- Redgate Flyway configuration precedence documentation: https://documentation.red-gate.com/flyway/reference/configuration-precedence
- Redgate Flyway environment variables documentation: https://documentation.red-gate.com/flyway/reference/environment-variables
- Redgate Flyway password setting documentation: https://documentation.red-gate.com/fd/environment-password-setting-277578929.html
- Liquibase changelog concepts documentation: https://www.liquibase.org/get-started/core-usage/liquibase-core-concepts-author-database-changes
- Liquibase rollback command documentation: https://docs.liquibase.com/commands/rollback/rollback.html
- Liquibase createIndex change type documentation: https://docs.liquibase.com/change-types/create-index.html
- Python datetime documentation: https://docs.python.org/3.12/library/datetime.html
- psycopg2 cursor documentation: https://www.psycopg.org/docs/cursor.html

## Issues Found
- The PostgreSQL online schema change section said PostgreSQL supports many ALTER operations without full table locks. PostgreSQL's ALTER TABLE documentation states that an ACCESS EXCLUSIVE lock is acquired unless explicitly noted, while current PostgreSQL can avoid a table rewrite for ADD COLUMN with a non-volatile default. Updated the comments to distinguish brief locking from avoiding a full table rewrite.
- The Flyway configuration snippet was marked as YAML even though `flyway.conf` uses properties-style syntax. Changed the code fence language to `properties`.
- The Flyway snippet used `flyway.password=${DB_MIGRATION_PASSWORD}`. Flyway documents `FLYWAY_PASSWORD` as the environment variable for the password setting, so the snippet now tells readers to supply the password through that environment variable instead of embedding a placeholder in the config.
- The Python rollback example used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated it to `datetime.now(timezone.utc)` and imported `timezone`.

## Review Notes
The examples are intentionally simplified. In a production rollback manager, storing and executing arbitrary rollback SQL should be tightly controlled, and migrations should usually be handled by established tooling rather than a custom rollback runner.
