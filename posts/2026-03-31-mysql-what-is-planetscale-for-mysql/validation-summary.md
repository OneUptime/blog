# Validation Summary: What Is PlanetScale for MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL
- PlanetScale
- Vitess
- PlanetScale CLI (pscale)
- Python (mysql.connector)
- Prisma ORM
- Homebrew

## Sources Consulted
- PlanetScale CLI Reference: https://planetscale.com/docs/reference/planetscale-cli
- PlanetScale CLI shell command: https://planetscale.com/docs/reference/shell
- PlanetScale foreign key constraints GA announcement: https://planetscale.com/changelog/foreign-key-constraints-ga
- PlanetScale foreign key constraints documentation: https://planetscale.com/docs/vitess/foreign-key-constraints
- PlanetScale environment setup (Homebrew install): https://planetscale.com/docs/cli/planetscale-environment-setup
- PlanetScale CLI GitHub repository: https://github.com/planetscale/cli
- PlanetScale deploy-request CLI reference: https://planetscale.com/docs/reference/deploy-request
- PlanetScale service tokens documentation: https://planetscale.com/docs/api/reference/service-tokens
- PlanetScale connection strings documentation: https://planetscale.com/docs/concepts/connection-strings

## Issues Found

1. **Incorrect CLI command `pscale query`**: The post used `pscale query myapp main` under the "Query Insights" section. There is no `pscale query` subcommand in the PlanetScale CLI. Changed to `pscale shell myapp main`, which opens an interactive MySQL shell. Updated the surrounding comments to clarify that query insights are a web dashboard feature.

2. **Incorrect terminology "service token"**: The post said "For production, use a service token" before a Python database connection example. In PlanetScale's terminology, service tokens are for API/CLI access, not database connections. Database connections use credentials created via `pscale password create`. Changed to "For production, create a database password".

3. **Outdated foreign key limitation**: The post stated "Foreign keys are not supported" and included a SQL comment block about using application-level referential integrity. PlanetScale made foreign key constraint support generally available in February 2024. Updated the limitation to reflect that foreign keys are supported (must be enabled in database settings) with the caveat that cross-shard foreign keys are not yet supported. Removed the now-unnecessary SQL comment block.

## Review Notes
- The Prisma config uses `relationMode = "prisma"` which was required when PlanetScale did not support foreign keys. With foreign key support now GA, this setting is no longer strictly necessary but remains valid and functional.
- Query insights (analytics dashboard showing query performance metrics) are a web-only feature at app.planetscale.com; the CLI does not have a dedicated insights command.
