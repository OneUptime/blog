# Validation Summary: How to Run Database Migrations with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflows
- GitHub Actions service containers and contexts
- Prisma Migrate
- PostgreSQL, pg_dump, pg_restore, and psql
- Flyway command-line and Docker image usage
- AWS CLI S3 uploads/downloads
- Slack webhook notification via curl

## Sources Consulted
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- actions/checkout documentation: https://github.com/actions/checkout
- actions/setup-node documentation: https://github.com/actions/setup-node
- Prisma deployment with Prisma Migrate: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate
- Prisma CLI reference: https://www.prisma.io/docs/orm/reference/prisma-cli-reference
- Redgate Flyway command-line documentation: https://documentation.red-gate.com/fd/command-line-277579359.html
- Redgate Flyway Docker quickstart: https://documentation.red-gate.com/fd/quickstart-docker-205226373.html
- Redgate Flyway locations setting: https://documentation.red-gate.com/fd/flyway-locations-setting-277579008.html
- Redgate Flyway validateOnMigrate setting: https://documentation.red-gate.com/fd/flyway-validate-on-migrate-setting-277579048.html
- Redgate Flyway outOfOrder setting: https://documentation.red-gate.com/fd/flyway-out-of-order-setting-277579015.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html

## Issues Found
- The basic Prisma migration workflow only watched `migrations/**` and `db/**`, so it would not run for Prisma's default `prisma/migrations/**` directory. Updated the path filter to `prisma/migrations/**`.
- The destructive migration check only diffed `migrations/`, which could miss Prisma migrations stored under `prisma/migrations/`. Updated the command to check both `migrations/` and `prisma/migrations/`.
- The Flyway `info` verification command did not mount the SQL migrations directory, so it could not compare the database history against the repository's migration files. Added the same `/flyway/sql` volume mount used by the migration step.
- The PostgreSQL restore example used `pg_restore --clean` without `--if-exists`, which can emit missing-object errors when dropping objects during restore. Added `--if-exists`, as recommended by the PostgreSQL documentation for use with `--clean`.

## Review Notes
The remaining GitHub Actions syntax, `actions/checkout@v6`, `actions/setup-node@v6`, Prisma `migrate deploy`, Prisma `validate`, Prisma `db pull --print`, Prisma `migrate status`, Flyway command-line options, `workflow_dispatch` choice inputs, PostgreSQL service container usage, `pg_dump -F c`, `psql` script execution, and step outcome handling with `continue-on-error` are technically valid based on current official documentation. The examples still use broad patterns and placeholders such as `flyway/flyway:latest`, static AWS access key secrets, and `SLACK_WEBHOOK`; these are workable examples, but production workflows may prefer pinned action/image versions, OIDC-based cloud credentials, and organization-specific approval controls.
