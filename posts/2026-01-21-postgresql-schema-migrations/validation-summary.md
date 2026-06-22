# Validation Summary: How to Manage PostgreSQL Schema Migrations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- Flyway
- Liquibase
- Alembic
- golang-migrate
- sqitch
- Docker
- GitHub Actions

## Sources Consulted
- PostgreSQL documentation: Modifying Tables - https://www.postgresql.org/docs/current/ddl-alter.html
- PostgreSQL documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: ALTER TABLE - https://www.postgresql.org/docs/current/sql-altertable.html
- Redgate Flyway documentation: Command-line - https://documentation.red-gate.com/fd/command-line-277579359.html
- Redgate Flyway documentation: PostgreSQL Database - https://documentation.red-gate.com/fd/postgresql-database-277579325.html
- Redgate Flyway documentation: SQL Migration Prefix Setting - https://documentation.red-gate.com/fd/flyway-sql-migration-prefix-setting-277579037.html
- Liquibase documentation: rollback-count - https://docs.liquibase.com/secure/reference-guide-5-2/init-update-and-rollback-commands/rollback-count
- Liquibase documentation: generate-changelog - https://docs.liquibase.com/secure/reference-guide-5-1-1/database-inspection-change-tracking-and-utility-commands/generate-changelog
- Liquibase documentation: status - https://docs.liquibase.com/secure/reference-guide-5-1-1/database-inspection-change-tracking-and-utility-commands/status
- Liquibase documentation: liquibase.properties - https://docs.liquibase.com/secure/user-guide-5-2/what-is-the-liquibase-properties-file
- Alembic documentation: Tutorial - https://alembic.sqlalchemy.org/en/latest/tutorial.html
- Alembic documentation: Auto Generating Migrations - https://alembic.sqlalchemy.org/en/latest/autogenerate.html
- Alembic documentation: Commands - https://alembic.sqlalchemy.org/en/latest/api/commands.html
- golang-migrate package documentation - https://pkg.go.dev/github.com/golang-migrate/migrate/v4
- GitHub Actions documentation: Creating PostgreSQL service containers - https://docs.github.com/actions/using-containerized-services/creating-postgresql-service-containers
- GitHub Actions documentation: Communicating with Docker service containers - https://docs.github.com/actions/tutorials/communicating-with-docker-service-containers

## Issues Found
- The Liquibase properties example was fenced as YAML even though `liquibase.properties` is a properties/defaults file. Changed the code fence to `properties`.
- The Liquibase rollback-count command used positional syntax. Updated it to the documented `liquibase rollback-count --count=1` form.
- The transaction-control section implied all migrations should be wrapped in transactions. Added a caveat that PostgreSQL statements such as `CREATE INDEX CONCURRENTLY` must run outside a transaction block.
- The Docker migration test started PostgreSQL without publishing port 5432, then attempted to connect through localhost. Added `-p 5432:5432`.
- The Docker migration test omitted Flyway credentials and used `psql` without supplying the password. Added `-user=postgres -password=test` to Flyway and `PGPASSWORD=test` for `psql`.
- The GitHub Actions job connected to the PostgreSQL service using hostname `postgres` while running directly on the runner. Updated the workflow to publish the service port and connect to `localhost`, and added Flyway user/password arguments.

## Review Notes
The example tool versions are not the newest available releases as of the review date, but the reviewed commands and configuration patterns remain valid after the corrections above. For production migrations, concurrent PostgreSQL index builds also need migration-tool-specific transaction handling, such as disabling transaction execution for that migration where the tool supports it.
