# Validation Summary: How to Run Medusa.js in Docker for E-Commerce

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Medusa.js
- Docker
- Docker Compose
- Node.js
- PostgreSQL
- Redis
- Next.js
- cURL

## Sources Consulted
- Medusa CLI `create-medusa-app@2.15.5 --help` output
- Medusa CLI user command: https://docs.medusajs.com/resources/medusa-cli/commands/user
- Medusa CLI develop command: https://docs.medusajs.com/resources/medusa-cli/commands/develop
- Medusa application configuration: https://docs.medusajs.com/learn/configurations/medusa-config
- Medusa deployment guide Redis module configuration: https://docs.medusajs.com/learn/deployment/general
- Medusa Store API publishable API key docs: https://docs.medusajs.com/api/store
- Medusa storefront publishable API key guide: https://docs.medusajs.com/resources/storefront-development/publishable-api-keys
- Medusa Next.js Starter Storefront docs: https://docs.medusajs.com/resources/nextjs-starter
- Medusa Admin API OpenAPI schema: https://docs.medusajs.com/api/download/admin
- Docker Compose documentation: https://docs.docker.com/compose/

## Issues Found
- The `create-medusa-app` examples used the obsolete `--directory` flag and combined `--skip-db` with `--db-url`. Updated them to use the current `--directory-path` option and a database-backed initialization flow.
- The Compose startup command recreated the Medusa app on every container start. Added a package.json guard and a `db:migrate` startup step so restarts are idempotent.
- The custom Dockerfile installed the old global `@medusajs/medusa-cli` package. Removed the global install and used the local Medusa CLI created by the app scaffold.
- The Medusa configuration example used the old `medusa-config.js` and v1-style snake_case fields. Updated it to `medusa-config.ts`, `defineConfig`, `databaseUrl`, nested `http` CORS/secret settings, and Redis module configuration.
- The Store API product listing example omitted the required `x-publishable-api-key` header. Added the header and clarified that the key must be associated with a sales channel.
- The storefront container example created a generic Next.js app instead of the Medusa starter. Updated it to clone the official Medusa Next.js starter and set the documented backend URL and publishable key environment variables.
- The Admin API product creation payload omitted product options and variant option mappings. Added a `Size` option and variant `options` values to match the current Admin API schema.
- The migration command used the old `medusa migrations run` syntax. Updated it to `medusa db:migrate`.
- The environment variable table omitted `AUTH_CORS`, which current Medusa auth routes use. Added it.

## Review Notes
The article is now aligned with current Medusa v2.15-era CLI and configuration patterns. It still presents a development-oriented Docker setup rather than a production image; future improvements could separate scaffold/build steps from runtime more cleanly.
